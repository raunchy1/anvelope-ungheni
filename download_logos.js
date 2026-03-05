const https = require('https');
const fs = require('fs');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error('Status: ' + response.statusCode));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function run() {
  try {
    await download("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Michelin_Logo.svg/512px-Michelin_Logo.svg.png", "public/brands/michelin.png");
    console.log("Michelin done");
    await download("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Pirelli_Logo.svg/512px-Pirelli_Logo.svg.png", "public/brands/pirelli.png");
    console.log("Pirelli done");
    await download("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Continental_AG_logo.svg/512px-Continental_AG_logo.svg.png", "public/brands/continental.png");
    console.log("Continental done");
    await download("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Goodyear_logo.svg/512px-Goodyear_logo.svg.png", "public/brands/goodyear.png");
    console.log("Goodyear done");
    await download("https://anvelope-ungheni.md/wp-content/uploads/2021/04/cropped-Logo_Anvelopen2-1.png", "public/brands/logo.png");
    console.log("Logo done");
  } catch(e) { console.error(e); }
}
run();
