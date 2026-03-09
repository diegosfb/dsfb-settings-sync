const https = require('https');
const fs = require('fs');

const gistId = '896c7e9b7746270e65a23fe7703d9655';
const options = {
    hostname: 'api.github.com',
    path: `/gists/${gistId}`,
    method: 'GET',
    headers: { 'User-Agent': 'NodeJS' }
};

https.get(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            fs.writeFileSync('gist_output.json', rawData);
            console.log('Fetching complete');
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Error: ${e.message}`);
});
