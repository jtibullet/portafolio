async function test() {
  const sp500Res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  const sp500Html = await sp500Res.text();
  const tableMatch = sp500Html.match(/<table class="wikitable sortable" id="constituents">([\s\S]*?)<\/table>/);
  if (tableMatch) {
    const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    let tickers = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (cols && cols.length > 0) {
        let ticker = cols[0].replace(/<[^>]+>/g, '').trim();
        ticker = ticker.replace('.', '-');
        tickers.push(ticker);
      }
    }
    console.log("SP500 length:", tickers.length);
    console.log("Sample:", tickers.slice(0,5));
  } else {
    console.log("No S&P500 table found");
  }

  const ndxRes = await fetch('https://en.wikipedia.org/wiki/Nasdaq-100', {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  const ndxHtml = await ndxRes.text();
  const ndxTableMatch = ndxHtml.match(/<table class="wikitable sortable" id="constituents">([\s\S]*?)<\/table>/);
  if (ndxTableMatch) {
    const rows = ndxTableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    let tickers = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (cols && cols.length > 1) { // Nasdaq usually has company name in col 0, ticker in col 1
        let ticker = cols[1].replace(/<[^>]+>/g, '').trim();
        ticker = ticker.replace('.', '-');
        tickers.push(ticker);
      }
    }
    console.log("NDX length:", tickers.length);
    console.log("Sample:", tickers.slice(0,5));
  } else {
    console.log("No NDX table found");
  }
}
test();
