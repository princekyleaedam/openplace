#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { BlobReader, FileEntry, ZipReader } from "@zip.js/zip.js";
import { execSync } from "child_process";
import inquirer from "inquirer";
import { COUNTRIES } from "../src/utils/country";
import chalk from "chalk";

const prisma = new PrismaClient();

const yes = process.argv.includes("--yes");

async function prompt(message: string, defaultValue: boolean = false) {
	if (yes) {
		return defaultValue;
	}

	return (await inquirer.prompt([
		{
			type: "confirm",
			name: "answer",
			message,
			default: defaultValue
		}
	])).answer;
}

async function downloadToUint8Array(url: string): Promise<Uint8Array[]> {
	const res = await fetch(url);
	if (!res.ok || !res.body) {
		throw new Error(`Failed to download ${url}: ${res.statusText}`);
	}

	const contentLength = Number.parseInt(res.headers.get("content-length") || "0", 10);
	const totalSize = (contentLength / 1024 / 1024)
		.toFixed(2);
	let size = 0;

	const chunks: Uint8Array[] = [];
	for await (const chunk of res.body as any) {
		size += chunk.length;
		chunks.push(chunk);

		const percent = ((size / contentLength) * 100).toFixed(1);
		const downloadedSize = (size / 1024 / 1024).toFixed(2);
		process.stdout.write(chalk.blue(`\rDownloading: ${percent}% (${downloadedSize} MB / ${totalSize} MB)`));
	}

	console.log("\n");
	return chunks;
}

console.log(chalk.bgHex("#406ae1").white.bold(" Welcome to openplace "));

if (!yes) {
	console.log("");
	console.log(chalk.gray("This script asks questions that require manual response. If you want to automate this script, run with --yes."));

	if (!(await prompt("Ready to continue?"))) {
		process.exit(1);
	}
}

// Run migrations
console.log("");
console.log(chalk.gray("Running database migration:"));

execSync("npm run db:push", {
	stdio: "inherit"
});

// Create base data
console.log("");
console.log(chalk.gray("Running base database setup:"));

const baseUsers = [
	{
		id: -1,
		name: "System"
	},

	{
		id: -2,
		name: "Deleted Account"
	}
];

for (const user of baseUsers) {
	await prisma.user.upsert({
		where: { id: user.id },
		update: {},
		create: {
			...user,
			country: "XX",
			passwordHash: "",
			banned: true
		}
	});
}

const hasRegionData = await prisma.region.count() > 0;
console.log("");
console.log(chalk.gray(hasRegionData
	? "You already have region data. You can choose to update it:"
	: "Choose the region data you would like to use:"));

if (!yes) {
	const regionChoice = await inquirer.prompt([
		{
			type: "list",
			name: "region",
			message: "GeoNames region data file:",
			choices: [
				{
					name: `Skip (${hasRegionData ? "keep existing data" : "don’t use region data"})`,
					value: null
				},
				{
					name: "Cities with population > 500 (224,000+ entries)",
					value: "cities500"
				},
				{
					name: "Cities with population > 1000 (162,000+ entries)",
					value: "cities1000"
				},
				{
					name: "Cities with population > 5000 (66,000+ entries)",
					value: "cities5000"
				},
				{
					name: "Pin-point landmarks (13 million+ entries, not recommended)",
					value: "allCountries"
				}
			]
		}
	]);

	if (regionChoice.region) {
		console.log(chalk.gray("Dropping existing region data"));
		await prisma.region.deleteMany({});
		await prisma.$executeRawUnsafe("ALTER TABLE Region AUTO_INCREMENT = 1");

		const countryCodesToIDs = new Map<string, number>(COUNTRIES.map(item => [item.code, item.id]));

		console.log(chalk.gray("Downloading region data"));

		const zip = await downloadToUint8Array(`https://download.geonames.org/export/dump/${regionChoice.region}.zip`);
		const zipFileReader = new BlobReader(new Blob(zip));
		const zipReader = new ZipReader(zipFileReader);
		const fileEntry = (await zipReader.getEntries())[0] as FileEntry;

		if (!fileEntry || fileEntry.directory) {
			throw new Error("Zip file did not contain the data file");
		}

		const transformStream = new TransformStream();
		const reader = transformStream.readable.getReader();
		const decoder = new TextDecoder();
		fileEntry.getData(transformStream.writable);

		let addedCount = 0;
		let buffer = "";
		let batch: string[] = [];
		const ignoredCountries = new Set<string>();

		const processBatch = async () => {
			const entries = [];
			for (const line of batch) {
				if (line.trim() === "") {
					continue;
				}

				const [id, name, _asciiName, _altName, latitude, longitude, _featureClass, _featureCode, countryCode] = line.split("\t") as string[];
				if (!id || !name || !latitude || !longitude || !countryCode) {
					console.warn(chalk.yellow("Skipping invalid line:"), line);
					continue;
				}

				// Only warn once about skipping a country
				if (ignoredCountries.has(countryCode)) {
					continue;
				}

				const countryId = countryCodesToIDs.get(countryCode);
				if (!countryId) {
					console.warn(chalk.yellow("Skipping unknown country:"), countryCode);
					ignoredCountries.add(countryCode);
					continue;
				}

				entries.push({
					cityId: Number.parseInt(id!, 10),
					name,
					number: 1,
					countryId,
					latitude: Number.parseFloat(latitude!),
					longitude: Number.parseFloat(longitude!)
				});
			}

			await prisma.region.createMany({
				data: entries,
				skipDuplicates: true
			});
			addedCount += entries.length;
			batch = [];
			process.stdout.write(chalk.blue(`\rInserted ${addedCount.toLocaleString()} entries`));
		};

		// Process 1000 lines at a time
		let hasData = true;
		while (hasData) {
			const { done, value } = await reader.read();
			hasData = !done;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				batch.push(line);

				if (batch.length >= 1000) {
					await processBatch();
				}
			}
		}

		if (buffer.trim() !== "") {
			const lines = buffer.split("\n");
			for (const line of lines) {
				batch.push(line);

				if (batch.length >= 1000) {
					await processBatch();
				}
			}
		}

		await zipReader.close();

		console.log("");
		console.log(chalk.blue.bold("Done"));
	}
}
