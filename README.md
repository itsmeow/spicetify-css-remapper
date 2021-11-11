# spicetify-css-remapper

Script designed to remap [spicetify-cli](https://github.com/khanhas/spicetify-cli)'s [css-map.json](https://github.com/khanhas/spicetify-cli/blob/master/css-map.json) between Spotify versions by matching xpui.css and xpui.js CSS classes with text diffs and a bunch of error resolution.

## Usage

### Extraction from Spotify client

Install the wanted Spotify version, go to `%appdata%/Spotify/Apps`

You will see `xpui.spa`, copy it, rename the copied file to `xpui.zip`, open the zip, extract the files you want.

### Steps

- Clone the repository `git clone https://github.com/itsmeow/spicetify-css-remapper`
- Make sure [NodeJS](https://nodejs.org/) is installed
- Run `npm i` to install dependencies
- Copy `xpui.js` and `xpui.css` from the old Spotify version into `spicetify-css-remapper`
- Rename files to `xpui_old.js` and `xpui_old.css`
- Copy the same files from the new Spotify version into `spicetify-css-remapper`
- Download [css-map.json](https://github.com/khanhas/spicetify-cli/blob/master/css-map.json) into `spicetify-css-remapper`
- Execute the script `node index.js`
- Output is placed into `css-map-new.json`

### Other notes

`diff.json` stores a temporary cache of the diff between the css files, be sure to delete it between uses if you want to compare the css files.
