#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { normalizeCidr, parseCidr } from "cidr-tools";
import { BanReason } from "../src/types";

const prisma = new PrismaClient();

if (process.argv.length < 3) {
	console.error("Usage: import-ip-list.ts <file>");
	console.error("One IP per line, either a single IP (1.2.3.4), or CIDR (1.2.3.0/24).");
	console.error("Lines starting with # are ignored.");
	process.exit(1);
}

const file = process.argv[2]!;

function ipv6ToUint8Array(value: bigint): Uint8Array {
	const bytes = new Uint8Array(16);
	for (let i = 15; i >= 0; i--) {
		bytes[i] = Number(value & 0xFFn);
		value >>= 8n;
	}
	return bytes;
}

async function processLines(lines: string[]) {
	await prisma.$transaction(async (tx) => {
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed === "" || trimmed.startsWith("#")) {
				continue;
			}

			try {
				const isIPv6 = trimmed.includes(":");
				const isCIDR = trimmed.includes("/");
				const cidr = normalizeCidr(isCIDR ? trimmed : `${trimmed}/${isIPv6 ? "128" : "32"}`);

				const { start, end } = parseCidr(cidr);
				if (!start || !end) {
					throw new Error("Invalid IP");
				}

				await tx.bannedIP.upsert({
					where: {
						cidr
					},
					update: {},
					create: {
						cidr,
						suspensionReason: BanReason.IPList,
						...(isIPv6
							? {
									ipv6Min: ipv6ToUint8Array(start),
									ipv6Max: ipv6ToUint8Array(end)
								}
							: {
									ipv4Min: Number(start),
									ipv4Max: Number(end)
								})
					}
				});
			} catch (error) {
				if ((error as { code: string; })?.code !== "P2002") {
					console.warn(`Invalid line skipped: ${trimmed}`, error);
				}
			}
		}
	}, {
		timeout: 120_000
	});
}

const stream = fs.createReadStream(file, { encoding: "utf8" });
let buffer = "";
let lines: string[] = [];
let total = 0;

stream.on("data", async (chunk) => {
	buffer += chunk;
	const parts = buffer.split("\n");
	buffer = parts.pop() || "";
	lines.push(...parts);

	while (lines.length >= 10) {
		const batch = lines.slice(0, 10);
		lines = lines.slice(10);
		await processLines(batch);
		total += batch.length;
		process.stdout.write(`\rImported ${total} IPs`);
	}
});

stream.on("end", async () => {
	await processLines(lines);
	total += lines.length;
	process.stdout.write(`\rImported ${total} IPs\n`);
	console.log("\nDone");
	await prisma.$disconnect();
	process.exit(0);
});
