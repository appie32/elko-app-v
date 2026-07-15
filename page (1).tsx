type PriceInput = {
  productType: string
  colorCategory?: string
  meshType?: string
}

export function getFallbackSuggestedPrice(input: PriceInput): number {
  const productType = input.productType
  const colorCategory = input.colorCategory || 'Standaardkleur'
  const meshType = input.meshType || 'Standaard horgaas'

  const isRal = colorCategory === 'RAL-kleur op maat'
  const isPremium = meshType === 'Premium horgaas / anti-pollen gaas'

  if (productType === 'Raamhor op maat' || productType === 'Klik-plissé raamhor') {
    return isRal || isPremium ? 175 : 150
  }

  if (productType === 'Enkele plissé hordeur') {
    if (isRal || isPremium) return 350
    return 300
  }

  if (productType === 'Dubbele plissé hordeur') {
    if (isRal && isPremium) return 695
    if (isRal || isPremium) return 645
    return 595
  }

  if (productType === 'Schuifpui plissé hordeur') {
    if (isRal && isPremium) return 445
    if (isRal || isPremium) return 395
    return 345
  }

  return 0
}
