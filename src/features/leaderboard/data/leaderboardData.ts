export const getAvatarGradient = (index: number): string => {
  const gradients = [
    'from-[#c9983a] to-[#a67c2e]',
    'from-[#d4af37] to-[#b8932e]',
    'from-[#b89968] to-[#9a7d4f]',
    'from-[#c9983a]/90 to-[#8b6f3a]',
    'from-[#d4c4b0] to-[#a89780]',
    'from-[#c4b5a0] to-[#9a8270]',
    'from-[#b8a590] to-[#8b7355]',
    'from-[#c9983a]/80 to-[#a67c2e]/80',
    'from-[#d4af37]/90 to-[#c9983a]/70',
    'from-[#b89968]/85 to-[#8b6f3a]/75',
  ]
  return gradients[index % gradients.length]
}
