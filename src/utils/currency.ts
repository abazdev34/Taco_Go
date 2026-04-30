export const formatPrice = (value: number) => {
  if (value === null || value === undefined) return "0 ₽";

  const hasCents = Math.round(value * 100) % 100 !== 0;

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value);
};