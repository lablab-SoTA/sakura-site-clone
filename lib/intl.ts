const numberFormatterJP = new Intl.NumberFormat("ja-JP");

export function formatNumberJP(value: number): string {
  return numberFormatterJP.format(value);
}
