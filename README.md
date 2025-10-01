# openplace
Openplace (styled lowercase) is a free unofficial open source backend for [wplace.](https://wplace.live) We aim to give the freedom and flexibility for all users to be able to make their own private wplace experience for themselves, their friends, or even their community.

> [!WARNING]
> This is a work-in-progress. Expect unfinished features and bugs. Please help us by posting issues in #help-n-support on our [Discord server](https://discord.gg/ZRC4DnP9Z2) or by contributing pull requests. Thanks!

## macOS
### Getting Started
This is where you will be preparing your machine to run openplace.
1. install brew, node and git
2. run `git clone --recurse-submodules https://github.com/openplaceteam/openplace`
3. cd into the openplace directory
4. run ``npm i && brew install mariadb caddy nss``
5. brew will then spit out a command to inform you on how to start it. if it doesn't, run `brew services start mariadb && brew services start caddy`
#### Configuring and building the database
1. run `sudo mysql_secure_installation`
2. it will then ask you for your current root password. just hit enter
3. hit 'n' when it asks you to switch to unix_socket authentication
4. hit 'y' when it asks you to change your root password. for demonstration purposes, i have made my password 'password'. (do not do this)
5. when it asks you to remove anonymous users, hit 'y'
6. it will ask you if you want to disallow remote root logins, this is entirely up to you.
7. hit 'y' when it asks you to remove the test database
8. finally, hit 'y' when it asks you to reload configuration.
9. copy the .env.example file on the root directory and rename it to .env where `root:password` is, replace `password` with your password.
10. you can now run `npx prisma migrate deploy`
11. next, `npx prisma generate`
12. NEXT, `npx prisma db push`
13. then you can run `npm run dev`
14. in another terminal, cd to the same root directory and run `caddy run --config Caddyfile`

#### Spinning up your server
You will be required to configure an SSL certificate if you plan to use this in production. However, if you are only using this with you and your friends, you can simply navigate to `https://{IP}:8080` NOTE: openplace is only hosted over HTTPS. you will run into HTTP error 400 if you attempt to load the website over HTTP.

#### Updating your database
In the event that the database schematic changes, you simply need to run `npm run db:push` to update your database schema.
