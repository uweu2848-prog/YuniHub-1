# YuniHub and YuniSpot releases

Push a `v*` tag to this repository to build and publish the Windows YuniHub installer and a separate `yunispot-<version>.tgz` download on the same GitHub release. The workflow uses `GITHUB_TOKEN`; the repository must allow Actions to create releases.

YuniSpot source is maintained in `yunispot/`. The Hub package includes that source and a Node runtime, but users opt in by choosing **Install YuniSpot** in YuniHub's Tools. The standalone tarball requires Node.js 18 or newer:

```powershell
npm install --global .\yunispot-0.8.1.tgz
yunispot apply
```

Close Spotify before applying. To update SpotX, use YuniSpot's **Ad blocking** Marketplace controls; each operation fetches the latest source from the official `SpotX-Official/SpotX` repository.
