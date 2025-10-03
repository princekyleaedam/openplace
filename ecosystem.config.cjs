module.exports = {
	apps: [
		{
			name: "Frontend",
			cwd: `.`,
			script: "cmd",
			args: "/c tsx watch src"
		}
		,
		{
			name: "Caddy (Backend)",
			script: `${process.env.LOCALAPPDATA  }/Microsoft/WinGet/Packages/CaddyServer.Caddy_Microsoft.Winget.Source_8wekyb3d8bbwe/caddy.exe`,
			args: "run --config Caddyfile"
		}
	]
};
