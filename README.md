# openplace
Openplace (styled lowercase) is a free unofficial open source backend for [wplace.](https://wplace.live) We aim to give the freedom and flexibility for all users to be able to make their own private wplace experience for themselves, their friends, or even their community.

> [!WARNING]
> This is a work-in-progress. Expect unfinished features and bugs. Please help us by posting issues in #help-n-support on our [Discord server](https://discord.gg/ZRC4DnP9Z2) or by contributing pull requests. Thanks!

## Getting Started

### Windows

- [Guideline for Windows Installation](SETUP_WINDOWS.md)

### macOS

- [Guideline for macOS Installation](SETUP_MACOS.md)


### Server accessibility
You will be required to configure an SSL certificate if you plan to use this in production. However, if you are only using this with you and your friends, you can simply navigate to `https://{IP}:8080` NOTE: openplace is only hosted over HTTPS. you will run into HTTP error 400 if you attempt to load the website over HTTP.

### Updating your database
In the event that the database schematic changes, you simply need to run `npm run db:push` to update your database schema.
