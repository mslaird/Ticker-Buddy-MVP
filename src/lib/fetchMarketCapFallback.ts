/**
 * Market Cap Fallback Fetcher
 * 
 * ISOLATED helper function that fetches market cap from Yahoo quoteSummary
 * when the primary market-data response doesn't include it.
 * 
 * TEMP DEBUG — REMOVE AFTER VERIFICATION
 */

export async function fetchMarketCapFallback(symbol: string): Promise<number | null> {
  if (!symbol || symbol.trim() === '') {
    return null;
  }

  const upperSymbol = symbol.trim().toUpperCase();

  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(upperSymbol)}?modules=price,summaryDetail,defaultKeyStatistics`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0];

    if (!result) {
      return null;
    }

    // Extract marketCap from first available source (in priority order)
    const marketCap = 
      result.price?.marketCap?.raw ??
      result.summaryDetail?.marketCap?.raw ??
      result.defaultKeyStatistics?.marketCap?.raw ??
      null;

    if (typeof marketCap === 'number' && marketCap > 0) {
      // TEMP DEBUG — REMOVE AFTER VERIFICATION
      console.log('[MarketCap Fallback]', upperSymbol, marketCap);
      return marketCap;
    }

    // TEMP DEBUG — REMOVE AFTER VERIFICATION
    console.log('[MarketCap Fallback]', upperSymbol, null);
    return null;
  } catch (error) {
    // TEMP DEBUG — REMOVE AFTER VERIFICATION
    console.log('[MarketCap Fallback]', upperSymbol, 'error');
    return null;
  }
}
