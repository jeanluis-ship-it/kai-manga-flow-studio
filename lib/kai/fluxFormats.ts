// The official Klein 4B Space accepts sides up to 1024 px in increments of eight.
export const fluxDimensions: Record<string, [number, number]> = {
  '1:1': [1024, 1024], '3:4': [768, 1024], '4:3': [1024, 768],
  '16:9': [1024, 576], '9:16': [576, 1024],
};
