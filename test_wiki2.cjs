const fs = require('fs');
async function test() {
  const sp500Res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
      headers: { "User-Agent": "Mozilla/5.0" }
  });
  const sp500Html = await sp500Res.text();
  const spIdx = sp500Html.indexOf('id="constituents"');
  if (spIdx > -1) {
    const spEndIdx = sp500Html.indexOf('</table>', spIdx);
    const tableHtml = sp500Html.substring(spIdx, spEndIdx);
    const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/g);
    let tickers = [];
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].match(/<td[\s\S]*?<\/td>/g);
        if (cols && cols.length > 0) {
            let ticker = cols[0].replace(/<[^>]+>/g, '').trim();
            ticker = ticker.replace('.', '-');
            if (ticker) tickers.push(ticker);
        }
    }
    console.log("SP500 length:", tickers.length);
    console.log("Sample:", tickers.slice(0,5));
  }

  const ndxRes = await fetch('https://en.wikipedia.org/wiki/Nasdaq-100', {
      headers: { "User-Agent": "Mozilla/5.0" }
  });
  const ndxHtml = await ndxRes.text();
  const ndxIdx = ndxHtml.indexOf('id="constituents"');
  if (ndxIdx > -1) {
    const ndxEndIdx = ndxHtml.indexOf('</table>', ndxIdx);
    const tableHtml = ndxHtml.substring(ndxIdx, ndxEndIdx);
    const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/g);
    let tickers = [];
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].match(/<td[\s\S]*?<\/td>/g);
        if (cols && cols.length > 1) {
            let ticker = cols[1].replace(/<[^>]+>/g, '').trim();
            ticker = ticker.replace('.', '-');
            if (ticker) tickers.push(ticker);
        }
    }
    console.log("NDX length:", tickers.length);
    console.log("Sample:", tickers.slice(0,5));
  }
}
test();
