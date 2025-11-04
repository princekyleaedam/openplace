# openplace

<p align="center"><strong>Translations</strong> v4.1</p>
<p align="center">
    <a href="translations/de/LIESMICH.md"><img src="https://flagcdn.com/256x192/de.png" width="48" alt="German Flag"></a>
    <a href="translations/fr/LISEZMOI.md"><img src="https://flagcdn.com/256x192/fr.png" width="48" alt="French Flag"></a>
    <a href="translations/id/README.md"><img src="https://flagcdn.com/256x192/id.png" width="48" alt="Indonesia Flag"></a>

## 

Openplace (styled lowercase) is a free unofficial open source backend for [wplace.](https://wplace.live) We aim to give the freedom and flexibility for all users to be able to make their own private wplace experience for themselves, their friends, or even their community.

> [WARNING ⚠️]
> This is a work-in-progress. Expect unfinished features and bugs. Please help us by posting issues in #tech-support on our [Discord server](https://discord.gg/ZRC4DnP9Z2) or by contributing pull requests. Thanks!

## Getting Started

### Windows

- [Guideline for Windows Installation](translations/en/SETUP_WINDOWS.md)

### macOS

- [Guideline for macOS Installation](translations/en/SETUP_MACOS.md)

### Docker

- [Guideline for Docker Installation](translations/en/SETUP_DOCKER.md)


### Server accessibility
You will be required to configure an SSL certificate if you plan to use this in production. However, if you are only using this with you and your friends, you can simply navigate to `https://{IP}:8080` NOTE: openplace is only hosted over HTTPS. you will run into HTTP error 400 if you attempt to load the website over HTTP.

### Updating your database
In the event that the database schematic changes, you simply need to run `npm run db:push` to update your database schema.

## Adding a Translation

> [WARNING ⚠️]
> Contributions made with AI will be rejected, and you **WILL** be banned from the repository. You must be proficient in the language you translate.

To contribute to this repository and translate the `README.md` and other installation files, please follow these steps.

### Change the version number at the top of this README to indicate a new language has been added

The version number is formatted as `X.XX`, where the first "X" represents the number of languages officially translated so far. The second set of "X"s after the period is changed whenever any modifications are made to the English version of the README.
This version number helps translators know when they need to update their existing translated content.

### Create a new folder in the `translations` directory named after your language’s ISO code

If you’re unsure what your ISO code is, you can check it [here](https://gist.githubusercontent.com/josantonius/b455e315bc7f790d14b136d61d9ae469/raw/416def353b8849c427e9062a9db6445c62e77f75/language-codes.json) or simply search online. You are looking for a two-letter code such as `"en"` for English.

### Copy the English files into your new folder

Copy the English files from the `translations` folder and the main `README.md` into the folder you just created.
You should now have four files: `README.md` and three installation markdown (`.md`) files.

### Add your country flag at the top of every README

At the top of **every** README (in all languages), add a new line that displays the flag of the language you are translating into.
You need to add a flag that links to your translated files. Use the following as a template:

```html
<a href="translations/LANGUAGE_ISO_CODE/NAME_OF_YOUR_README.md"><img src="https://flagcdn.com/256x192/LANGUAGE_ISO_CODE.png" width="48" alt="NAME_OF_COUNTRY Flag"></a>
```

Replace the placeholders with the correct values for your language.

> [WARNING ⚠️]
> Be careful! Every README should link directly to all other READMEs.
> Flags must remain in the same order (alphabetical according to their ISO codes) except for English, which always appears first (e.g., `en`, `de`, `es`, `fr`).

### Update links in the Getting Started section

In the **Getting Started** section, update the links so they point to your translated files.
If you’re unsure how to do this, refer to another language folder (for example, `fr`).

### Translate all files

Translate all the files completely and accurately.
Once you’ve finished, make a pull request. A contributor or user will verify your work.
**Do not forget:** the use of AI is strictly prohibited and will result in a permanent ban if detected.

### Verify your work

Click on **EVERY** link and flag. Each one must work correctly and lead to the appropriate file or website.
If something doesn’t work, fix it before submitting your pull request.
Once everything functions as expected, you can confidently open your pull request.
Remember: these guidelines will be reviewed for all translations to ensure full compliance.


## License
Licensed under the Apache License, version 2.0. Refer to [LICENSE.md](https://github.com/openplaceteam/openplace/blob/main/LICENSE.md).

### Acknowledgements
Region data is from [GeoNames Gazetteer](https://download.geonames.org/export/dump/), and is licensed under a [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/). The Data is provided “as is” without warranty or any representation of accuracy, timeliness or completeness.