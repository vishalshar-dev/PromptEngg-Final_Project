import { CategoryIcon } from './CategoryIcon';

export interface ProductArtworkSpec {
  key: string;
  bgClass: string;
  renderSvg: () => JSX.Element;
}

function resolveArtworkKey(name: string, category: string): string {
  const n = name.toLowerCase();
  const c = category.toLowerCase();

  if (n.includes('basmati') || n.includes('sona masoori') || n.includes('kolam') || n.includes('rice')) return 'rice';
  if (n.includes('atta') || n.includes('wheat flour') || n.includes('besan') || n.includes('sooji') || n.includes('rava') || n.includes('maida') || n.includes('poha') || n.includes('oats') || n.includes('flour')) return 'flour';
  if (n.includes('sugar') || n.includes('jaggery') || n.includes('gur')) return 'sugar';
  if (n.includes('salt') || n.includes('namak')) return 'salt';
  if (n.includes('cooking oil') || n.includes('sunflower') || n.includes('mustard oil') || n.includes('groundnut') || n.includes('oil')) return 'oil';
  if (n.includes('dal') || n.includes('pulse') || n.includes('lentil') || n.includes('rajma') || n.includes('chana')) return 'pulses';
  if (n.includes('ghee')) return 'ghee';
  if (n.includes('turmeric') || n.includes('haldi') || n.includes('masala') || n.includes('jeera') || n.includes('chilli powder') || n.includes('spice') || n.includes('pickle') || n.includes('achar') || n.includes('papad')) return 'spices';

  if (n.includes('tomato')) return 'tomato';
  if (n.includes('onion')) return 'onion';
  if (n.includes('potato')) return 'potato';
  if (n.includes('palak') || n.includes('spinach') || n.includes('methi') || n.includes('coriander') || n.includes('bhindi') || n.includes('cucumber') || n.includes('cabbage') || n.includes('peas') || n.includes('leafy')) return 'spinach';
  if (n.includes('banana')) return 'banana';
  if (n.includes('apple') || n.includes('pomegranate') || n.includes('papaya') || n.includes('watermelon') || n.includes('mango') || n.includes('coconut')) return 'apple';

  if (n.includes('milk') || n.includes('lassi') || n.includes('chaas')) return 'milk';
  if (n.includes('curd') || n.includes('dahi') || n.includes('yogurt') || n.includes('batter')) return 'curd';
  if (n.includes('paneer')) return 'paneer';
  if (n.includes('bread') || n.includes('bun') || n.includes('pav') || n.includes('rusk') || n.includes('khari')) return 'bread';
  if (n.includes('butter') || n.includes('honey') || n.includes('jam')) return 'butter';
  if (n.includes('cheese')) return 'cheese';

  if (n.includes('chips') || n.includes('namkeen') || n.includes('bhujia') || n.includes('makhana') || n.includes('noodle') || n.includes('maggi') || n.includes('pasta') || n.includes('vermicelli')) return 'chips';
  if (n.includes('biscuit') || n.includes('cookie') || n.includes('cornflakes') || n.includes('muesli')) return 'biscuit';
  if (n.includes('cola') || n.includes('soda') || n.includes('coconut water')) return 'soda';
  if (n.includes('juice') || n.includes('orange') || n.includes('mango drink')) return 'juice';
  if (n.includes('chocolate') || n.includes('silk') || n.includes('almond') || n.includes('cashew')) return 'chocolate';
  if (n.includes('coffee') || n.includes('bournvita')) return 'coffee';
  if (n.includes('tea') || n.includes('chai')) return 'tea';

  if (n.includes('egg')) return 'eggs';
  if (n.includes('chicken') || n.includes('fish') || n.includes('meat')) return 'chicken';

  if (n.includes('body wash') || n.includes('soap') || n.includes('handwash')) return 'bodywash';
  if (n.includes('shampoo') || n.includes('conditioner') || n.includes('hair oil')) return 'shampoo';
  if (n.includes('toothpaste') || n.includes('toothbrush') || n.includes('mouthwash')) return 'toothpaste';
  if (n.includes('face wash') || n.includes('sunscreen') || n.includes('moisturizer') || n.includes('deodorant') || n.includes('razor') || n.includes('pad')) return 'facewash';

  if (n.includes('tissue') || n.includes('paper') || n.includes('foil')) return 'tissue';
  if (n.includes('trash') || n.includes('garbage') || n.includes('bag')) return 'bags';
  if (n.includes('bulb') || n.includes('led') || n.includes('agarbatti') || n.includes('camphor')) return 'bulb';
  if (n.includes('container') || n.includes('cookware') || n.includes('frypan') || n.includes('tawa')) return 'container';
  if (n.includes('bottle') || n.includes('flask')) return 'bottle';

  if (n.includes('detergent') || n.includes('laundry') || n.includes('fabric')) return 'detergent';
  if (n.includes('dishwash') || n.includes('scrubber') || n.includes('sponge')) return 'dishwash';
  if (n.includes('floor') || n.includes('surface cleaner') || n.includes('toilet') || n.includes('glass') || n.includes('broom') || n.includes('mop') || n.includes('mosquito') || n.includes('disinfectant')) return 'cleaner';

  if (n.includes('cable') || n.includes('usb') || n.includes('charger') || n.includes('earphone') || n.includes('mouse')) return 'cable';
  if (n.includes('batter') || n.includes('extension')) return 'battery';
  if (n.includes('sock')) return 'socks';
  if (n.includes('t-shirt') || n.includes('shirt') || n.includes('tee')) return 'tshirt';
  if (n.includes('vitamin') || n.includes('tablet') || n.includes('tab') || n.includes('ors') || n.includes('balm') || n.includes('eno')) return 'vitamin';
  if (n.includes('bandage') || n.includes('first aid') || n.includes('antiseptic') || n.includes('thermometer')) return 'bandage';
  if (n.includes('notebook') || n.includes('spiral')) return 'notebook';
  if (n.includes('pen') || n.includes('marker')) return 'pen';

  if (n.includes('wi-fi') || n.includes('wifi') || n.includes('broadband') || n.includes('fiber')) return 'wifi';
  if (n.includes('recharge') || n.includes('mobile') || n.includes('dth')) return 'mobile';
  if (n.includes('electricity')) return 'electricity';
  if (n.includes('gas') || n.includes('lpg') || n.includes('cylinder')) return 'gas';
  if (n.includes('petrol') || n.includes('fuel')) return 'fuel';
  if (n.includes('metro') || n.includes('transit') || n.includes('cab')) return 'metro';
  if (n.includes('cinema') || n.includes('movie') || n.includes('ticket')) return 'movie';
  if (n.includes('streaming') || n.includes('music')) return 'streaming';
  if (n.includes('courier') || n.includes('parcel')) return 'parcel';

  if (c.includes('grocer') || c.includes('breakfast')) return 'rice';
  if (c.includes('fruit') || c.includes('veg')) return 'apple';
  if (c.includes('dairy')) return 'milk';
  if (c.includes('snack')) return 'chips';
  return 'generic';
}

const ARTWORK_BACKDROPS: Record<string, string> = {
  rice: 'from-[#F7F3E9] to-[#EFE6D2]',
  flour: 'from-[#FBF4EA] to-[#F3E5CF]',
  sugar: 'from-[#F1F5FB] to-[#E3ECF9]',
  salt: 'from-[#EFF6FA] to-[#DFEEF6]',
  oil: 'from-[#FEF8E7] to-[#FCECC5]',
  pulses: 'from-[#FDF2E6] to-[#FAE0C5]',
  ghee: 'from-[#FEF6E4] to-[#FCE6B8]',
  spices: 'from-[#FDF0E6] to-[#F9D8C0]',
  tomato: 'from-[#FDECEC] to-[#FAD8D8]',
  onion: 'from-[#F7ECF6] to-[#EED5EC]',
  potato: 'from-[#F7F1E7] to-[#ECE0CC]',
  spinach: 'from-[#EAF7F0] to-[#D4EEDF]',
  banana: 'from-[#FEF9E6] to-[#FCF0C2]',
  apple: 'from-[#FDECEE] to-[#FAD6DA]',
  milk: 'from-[#EDF4FF] to-[#DCE9FF]',
  curd: 'from-[#EEF7FB] to-[#DCEEF7]',
  paneer: 'from-[#F5F7FA] to-[#E7ECF4]',
  bread: 'from-[#FAF0E3] to-[#F2DEC4]',
  butter: 'from-[#FEF7E0] to-[#FDECB8]',
  cheese: 'from-[#FEF5DD] to-[#FDE7B0]',
  chips: 'from-[#FFF1E6] to-[#FFE0C7]',
  biscuit: 'from-[#FBF0E4] to-[#F5DEC5]',
  soda: 'from-[#FDECEF] to-[#FAD8DF]',
  juice: 'from-[#FFF3E3] to-[#FFE2BC]',
  chocolate: 'from-[#F5EDE8] to-[#E8D8CE]',
  coffee: 'from-[#F3ECE6] to-[#E6D8CC]',
  tea: 'from-[#ECF6F0] to-[#D8EBDF]',
  eggs: 'from-[#FBF5EC] to-[#F4E8D5]',
  chicken: 'from-[#FDEEEE] to-[#F9D8D8]',
  bodywash: 'from-[#EBF7F6] to-[#D4ECEA]',
  shampoo: 'from-[#F2EEFB] to-[#E3DAF6]',
  toothpaste: 'from-[#EAF6FA] to-[#D4ECF5]',
  facewash: 'from-[#ECF8F3] to-[#D5EFE4]',
  tissue: 'from-[#F4F6F9] to-[#E6EBF1]',
  bags: 'from-[#EEF5F2] to-[#DCEAE4]',
  bulb: 'from-[#FEF9E7] to-[#FCEEBE]',
  container: 'from-[#EDF4FA] to-[#DCE8F5]',
  bottle: 'from-[#ECF6FA] to-[#D7ECF5]',
  detergent: 'from-[#EDF2FF] to-[#DCE5FF]',
  dishwash: 'from-[#F4F9E8] to-[#E4F0C8]',
  cleaner: 'from-[#E9F6FA] to-[#D2ECF5]',
  cable: 'from-[#EFF2F7] to-[#E0E5EE]',
  battery: 'from-[#FEF3E7] to-[#FCE2C5]',
  socks: 'from-[#F1F3F8] to-[#E2E6F0]',
  tshirt: 'from-[#EDF2FA] to-[#DCE5F5]',
  vitamin: 'from-[#FFF2E5] to-[#FFE0C2]',
  bandage: 'from-[#FDEEEE] to-[#F9DADA]',
  notebook: 'from-[#EDF3FC] to-[#DBE6FA]',
  pen: 'from-[#EEF2FC] to-[#DCE4FA]',
  wifi: 'from-[#EDF3FF] to-[#DBE6FF]',
  mobile: 'from-[#EDF6FA] to-[#DAEBF5]',
  electricity: 'from-[#FEF8E5] to-[#FCECB8]',
  gas: 'from-[#FDEEEE] to-[#FAD7D7]',
  fuel: 'from-[#FFF2E8] to-[#FFE0C9]',
  metro: 'from-[#EDF4FF] to-[#DBE7FF]',
  movie: 'from-[#F3EEFB] to-[#E4DAF6]',
  streaming: 'from-[#FDEEF4] to-[#FAD8E6]',
  parcel: 'from-[#F6F1EA] to-[#EAE0D2]',
  generic: 'from-[#F4F6FA] to-[#E7ECF4]',
};

function renderVectorByKey(key: string, fallbackIconKey?: string) {
  switch (key) {
    case 'rice':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="17" y="13" width="30" height="40" rx="6" fill="#FFFFFF" stroke="#C59B5F" strokeWidth="2.2" />
          <path d="M17 22h30" stroke="#E5D3B3" strokeWidth="1.8" />
          <path d="M24 13l2-4h12l2 4" fill="#E8D8B9" stroke="#C59B5F" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="36" r="8.5" fill="#FBF4E4" stroke="#D9A441" strokeWidth="1.8" />
          <path d="M32 30v12M28.5 34c2 0 3.5-1.5 3.5-3M35.5 34c-2 0-3.5-1.5-3.5-3M28.5 38.5c2 0 3.5-1.5 3.5-3M35.5 38.5c-2 0-3.5-1.5-3.5-3" stroke="#B68025" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'flour':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M18 18c0-3 3-5 6-5h16c3 0 6 2 6 5l2 29c0 3-2.5 5-5.5 5h-21c-3 0-5.5-2-5.5-5l2-29z" fill="#FFFDF9" stroke="#B88346" strokeWidth="2.2" />
          <path d="M20 22h24" stroke="#E7D3B8" strokeWidth="2" />
          <rect x="23" y="28" width="18" height="14" rx="4" fill="#F8E7CF" stroke="#C7851F" strokeWidth="1.6" />
          <path d="M28 35h8M32 31v8" stroke="#A66A14" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'sugar':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="19" y="18" width="26" height="33" rx="6" fill="#FFFFFF" stroke="#5A7FC2" strokeWidth="2.2" />
          <rect x="21" y="12" width="22" height="6" rx="2.5" fill="#DCE6F8" stroke="#5A7FC2" strokeWidth="2" />
          <rect x="24" y="29" width="7" height="7" rx="1.5" fill="#EDF3FF" stroke="#7B9CD6" strokeWidth="1.6" />
          <rect x="33" y="29" width="7" height="7" rx="1.5" fill="#EDF3FF" stroke="#7B9CD6" strokeWidth="1.6" />
          <rect x="28.5" y="38" width="7" height="7" rx="1.5" fill="#EDF3FF" stroke="#7B9CD6" strokeWidth="1.6" />
        </svg>
      );
    case 'salt':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M22 20h20l3 29a4 4 0 01-4 4H23a4 4 0 01-4-4l3-29z" fill="#FFFFFF" stroke="#367CA8" strokeWidth="2.2" />
          <path d="M24 20v-4a6 6 0 016-6h4a6 6 0 016 6v4" fill="#D9EEF8" stroke="#367CA8" strokeWidth="2" />
          <rect x="24" y="29" width="16" height="11" rx="2.5" fill="#E8F4FA" stroke="#5B9EC7" strokeWidth="1.5" />
          <circle cx="29" cy="14" r="1" fill="#367CA8" />
          <circle cx="32" cy="14" r="1" fill="#367CA8" />
          <circle cx="35" cy="14" r="1" fill="#367CA8" />
        </svg>
      );
    case 'oil':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="27" y="9" width="10" height="6" rx="2" fill="#E5A23B" stroke="#A66B14" strokeWidth="1.8" />
          <path d="M25 15h14l4 8v25a5 5 0 01-5 5H26a5 5 0 01-5-5V23l4-8z" fill="#FFF3C9" stroke="#C7851F" strokeWidth="2.2" />
          <path d="M43 24h3a3 3 0 013 3v9a3 3 0 01-3 3h-3" fill="none" stroke="#C7851F" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="25" y="29" width="14" height="12" rx="3" fill="#FFFFFF" stroke="#E5A23B" strokeWidth="1.5" />
          <path d="M32 32c-2 2.5-3 4-3 5.2a3 3 0 006 0c0-1.2-1-2.7-3-5.2z" fill="#E5A23B" />
        </svg>
      );
    case 'pulses':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M16 32c0-7 7.2-12 16-12s16 5 16 12" fill="#F8C76A" stroke="#BA7518" strokeWidth="2" />
          <path d="M13 32h38c0 11-8 19-19 19S13 43 13 32z" fill="#FFFFFF" stroke="#BA7518" strokeWidth="2.2" />
          <circle cx="26" cy="27" r="2" fill="#D9821E" />
          <circle cx="32" cy="25" r="2" fill="#D9821E" />
          <circle cx="38" cy="27" r="2" fill="#D9821E" />
          <path d="M22 39h20" stroke="#EFE1CA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'ghee':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="19" y="13" width="26" height="6" rx="2.5" fill="#C7851F" stroke="#9E6614" strokeWidth="1.8" />
          <rect x="17" y="19" width="30" height="32" rx="6" fill="#FFE8A3" stroke="#B67617" strokeWidth="2.2" />
          <rect x="21" y="26" width="22" height="16" rx="3" fill="#FFFFFF" stroke="#D99B2B" strokeWidth="1.5" />
          <path d="M32 29c-2.3 3-3.5 4.8-3.5 6.3a3.5 3.5 0 007 0c0-1.5-1.2-3.3-3.5-6.3z" fill="#E5A23B" />
        </svg>
      );
    case 'spices':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="17" y="17" width="30" height="34" rx="5" fill="#FFF4E3" stroke="#C86428" strokeWidth="2.2" />
          <rect x="20" y="12" width="24" height="5" rx="2" fill="#E57A35" stroke="#B4531A" strokeWidth="1.8" />
          <circle cx="32" cy="34" r="8" fill="#F9B43B" stroke="#C86428" strokeWidth="1.8" />
          <path d="M32 29v10M27 34h10" stroke="#FFF8EA" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'tomato':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <circle cx="32" cy="35" r="15" fill="#EE5A52" stroke="#B9322C" strokeWidth="2.2" />
          <path d="M25 27c2-3 5-4 7-4" stroke="#F8A19C" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 20c-3-4-7-3-8-1 3 1 5 3 8 3s5-2 8-3c-1-2-5-3-8 1z" fill="#2CA368" stroke="#1E7B4C" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 19v-5" stroke="#1E7B4C" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'onion':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M32 13c2 6 15 11 15 24a15 15 0 01-30 0c0-13 13-18 15-24z" fill="#C973B6" stroke="#8C3D7A" strokeWidth="2.2" />
          <path d="M32 15c-1 8-7 13-7 22a7 7 0 0014 0c0-9-6-14-7-22z" fill="#DF9AD0" opacity="0.65" />
          <path d="M32 13v-4M29 12l3 2 3-2" stroke="#6E2E5F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'potato':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <ellipse cx="32" cy="34" rx="18" ry="13" transform="rotate(-12 32 34)" fill="#E3C18D" stroke="#9E7742" strokeWidth="2.2" />
          <circle cx="24" cy="31" r="1.5" fill="#9E7742" />
          <circle cx="37" cy="29" r="1.3" fill="#9E7742" />
          <circle cx="34" cy="39" r="1.6" fill="#9E7742" />
          <circle cx="42" cy="36" r="1.2" fill="#9E7742" />
        </svg>
      );
    case 'spinach':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M32 48V24" stroke="#1E7B4C" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M32 42c-11 0-16-8-14-18 8-3 16 4 14 18z" fill="#35B073" stroke="#1E7B4C" strokeWidth="2" />
          <path d="M32 39c11 0 16-9 13-19-8-2-15 5-13 19z" fill="#46C786" stroke="#1E7B4C" strokeWidth="2" />
          <path d="M32 31c-6-6-5-14 0-19 5 5 6 13 0 19z" fill="#63D89D" stroke="#1E7B4C" strokeWidth="1.8" />
        </svg>
      );
    case 'banana':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M44 15c2 12-5 27-24 31-3 1-5-2-3-4 11-5 17-14 20-27 1-2 6-2 7 0z" fill="#FAD24B" stroke="#B68A12" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M47 18c2 11-4 24-21 29-2 1-3-1-2-3 10-4 15-12 18-25 1-2 4-2 5-1z" fill="#FCE17B" stroke="#B68A12" strokeWidth="2" strokeLinejoin="round" />
          <path d="M43 13l4 3" stroke="#7A5A0A" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'apple':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M32 23c4-3 12-2 14 6 2 9-4 20-10 21-2 0-3-1-4-1s-2 1-4 1c-6-1-12-12-10-21 2-8 10-9 14-6z" fill="#E84F5A" stroke="#A72630" strokeWidth="2.2" />
          <path d="M32 22V14" stroke="#6E4A2C" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M33 17c4-4 9-3 10 0-3 3-7 3-10 0z" fill="#35B073" stroke="#1E7B4C" strokeWidth="1.6" />
          <path d="M24 28c-1 3-1 6 0 9" stroke="#F8A3A9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'milk':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M22 18h20l3 6v27a2 2 0 01-2 2H21a2 2 0 01-2-2V24l3-6z" fill="#FFFFFF" stroke="#365FE8" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M22 18l3-6h14l3 6" fill="#DCE6FF" stroke="#365FE8" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M19 24h26" stroke="#365FE8" strokeWidth="1.8" />
          <rect x="23" y="30" width="18" height="14" rx="3" fill="#EDF2FF" />
          <path d="M32 33c-2.2 2.6-3.2 4.2-3.2 5.6a3.2 3.2 0 006.4 0c0-1.4-1-3-3.2-5.6z" fill="#365FE8" />
        </svg>
      );
    case 'curd':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M16 23h32l-3 25a3 3 0 01-3 3H22a3 3 0 01-3-3l-3-25z" fill="#FFFFFF" stroke="#2D84B5" strokeWidth="2.2" />
          <rect x="14" y="17" width="36" height="6" rx="2.5" fill="#D5EEF9" stroke="#2D84B5" strokeWidth="2" />
          <path d="M23 34c3-2 6-2 9 0s6 2 9 0" stroke="#5AAAD4" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'paneer':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <polygon points="16,25 34,17 48,25 30,33" fill="#FFFFFF" stroke="#64748B" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="16,25 30,33 30,48 16,40" fill="#F1F5F9" stroke="#64748B" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="30,33 48,25 48,40 30,48" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'bread':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M16 29c0-7 6-12 16-12s16 5 16 12c0 2.5-1.2 4.5-3 5.5V48a3 3 0 01-3 3H22a3 3 0 01-3-3V34.5c-1.8-1-3-3-3-5.5z" fill="#F6DCAC" stroke="#9F692A" strokeWidth="2.2" />
          <path d="M22 25c3-2 7-3 10-3s7 1 10 3" stroke="#C58942" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M25 36h14M25 42h10" stroke="#D3A56A" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'butter':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="13" y="38" width="38" height="8" rx="3" fill="#FFFFFF" stroke="#C7851F" strokeWidth="2" />
          <rect x="18" y="24" width="28" height="14" rx="3" fill="#FCE068" stroke="#C7851F" strokeWidth="2.1" />
          <path d="M24 29h12" stroke="#FFF6C4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'cheese':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M14 31l25-13 11 13v16H14V31z" fill="#FCD34D" stroke="#B7791F" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M14 31h36" stroke="#B7791F" strokeWidth="2" />
          <circle cx="24" cy="39" r="3" fill="#FEF3C7" stroke="#B7791F" strokeWidth="1.5" />
          <circle cx="37" cy="41" r="2.2" fill="#FEF3C7" stroke="#B7791F" strokeWidth="1.5" />
          <circle cx="33" cy="27" r="2" fill="#FEF3C7" stroke="#B7791F" strokeWidth="1.4" />
        </svg>
      );
    case 'chips':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M19 15h26l-2 34H21l-2-34z" fill="#FF8C42" stroke="#B84B14" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M18 12h28v4H18zM20 48h24v4H20z" fill="#FCD34D" stroke="#B84B14" strokeWidth="1.8" />
          <ellipse cx="32" cy="32" rx="7" ry="5" fill="#FDE68A" stroke="#B84B14" strokeWidth="1.7" />
        </svg>
      );
    case 'biscuit':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <circle cx="32" cy="32" r="16" fill="#E8B878" stroke="#9F692A" strokeWidth="2.2" />
          <circle cx="32" cy="32" r="11" fill="none" stroke="#C58B43" strokeWidth="1.5" strokeDasharray="2 3" />
          <circle cx="27" cy="29" r="1.4" fill="#9F692A" />
          <circle cx="37" cy="29" r="1.4" fill="#9F692A" />
          <circle cx="27" cy="36" r="1.4" fill="#9F692A" />
          <circle cx="37" cy="36" r="1.4" fill="#9F692A" />
          <circle cx="32" cy="32.5" r="1.4" fill="#9F692A" />
        </svg>
      );
    case 'soda':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="22" y="14" width="20" height="36" rx="4" fill="#E13B48" stroke="#991B26" strokeWidth="2.2" />
          <path d="M22 21h20M22 43h20" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M27 29l10 6M37 29l-10 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <path d="M25 14l2-3h10l2 3" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.8" />
        </svg>
      );
    case 'juice':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="21" y="18" width="22" height="33" rx="4" fill="#FFA238" stroke="#C2640E" strokeWidth="2.2" />
          <path d="M21 18l4-6h14l4 6" fill="#FFE0B2" stroke="#C2640E" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="34" r="6.5" fill="#FFF7E6" stroke="#C2640E" strokeWidth="1.6" />
          <circle cx="32" cy="34" r="2.8" fill="#FF8811" />
        </svg>
      );
    case 'chocolate':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="19" y="13" width="26" height="38" rx="4" fill="#7D4E38" stroke="#4D2C1D" strokeWidth="2.2" />
          <path d="M19 25h26M19 37h26M32 13v38" stroke="#4D2C1D" strokeWidth="1.8" />
          <path d="M19 31l26-6v22H19V31z" fill="#6D44B8" opacity="0.22" />
        </svg>
      );
    case 'coffee':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="20" y="19" width="24" height="31" rx="5" fill="#FFFFFF" stroke="#6B442A" strokeWidth="2.2" />
          <rect x="22" y="12" width="20" height="7" rx="2.5" fill="#8C593B" stroke="#5A3620" strokeWidth="2" />
          <rect x="23" y="26" width="18" height="16" rx="2.5" fill="#EFE4DB" stroke="#8C593B" strokeWidth="1.5" />
          <ellipse cx="32" cy="34" rx="4" ry="5.5" fill="#6B442A" />
          <path d="M32 29c-1 2.5 1 5.5 0 10" stroke="#EFE4DB" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'tea':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="18" y="18" width="28" height="32" rx="4" fill="#2A8C5E" stroke="#185C3C" strokeWidth="2.2" />
          <rect x="22" y="25" width="20" height="15" rx="3" fill="#FFFDF7" />
          <path d="M32 28c-4 2-5 6-2 9 3 1 6-1 6-5-1-2-2-3-4-4z" fill="#2A8C5E" />
          <rect x="21" y="13" width="22" height="5" rx="2" fill="#D9A441" stroke="#9E6614" strokeWidth="1.8" />
        </svg>
      );
    case 'eggs':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <ellipse cx="24" cy="35" rx="9" ry="12" fill="#FFFDF7" stroke="#BA9260" strokeWidth="2.2" />
          <ellipse cx="39" cy="32" rx="9" ry="12" fill="#FBEBD5" stroke="#BA9260" strokeWidth="2.2" />
        </svg>
      );
    case 'chicken':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M22 25c6-7 17-7 22 0 4 6 2 14-5 17-4 2-9 2-13 5l-4 4-4-4 4-4c3-4 0-12 0-18z" fill="#F7C2B2" stroke="#B6493A" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="17" cy="48" r="2.5" fill="#FFFFFF" stroke="#B6493A" strokeWidth="1.8" />
        </svg>
      );
    case 'bodywash':
    case 'shampoo':
    case 'facewash':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M27 14h10v5H27zM29 14V9h6" fill="none" stroke="#365FE8" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="21" y="19" width="22" height="32" rx="6" fill="#FFFFFF" stroke="#365FE8" strokeWidth="2.2" />
          <rect x="24" y="27" width="16" height="14" rx="3" fill={key === 'shampoo' ? '#EDE7FA' : '#E3F5F2'} />
          <circle cx="32" cy="34" r="3.5" fill={key === 'shampoo' ? '#7B5CD6' : '#15966B'} />
        </svg>
      );
    case 'toothpaste':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M16 40l24-20 8 8-20 24-12-12z" fill="#FFFFFF" stroke="#2D84B5" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M12 44l4-4 8 8-4 4z" fill="#2D84B5" stroke="#1E5D82" strokeWidth="1.8" />
          <path d="M27 36l9-9" stroke="#15966B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'detergent':
    case 'dishwash':
    case 'cleaner':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="26" y="10" width="10" height="6" rx="2" fill="#365FE8" />
          <path d="M23 16h16l6 10v22a4 4 0 01-4 4H21a4 4 0 01-4-4V24l6-8z" fill={key === 'dishwash' ? '#EBF7D4' : '#E6EEFF'} stroke={key === 'dishwash' ? '#5A9A18' : '#365FE8'} strokeWidth="2.2" />
          <circle cx="31" cy="35" r="6" fill="#FFFFFF" stroke={key === 'dishwash' ? '#5A9A18' : '#365FE8'} strokeWidth="1.8" />
        </svg>
      );
    case 'bulb':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <path d="M23 33a11 11 0 1118 0c-2 2.5-3 5-3 7H26c0-2-1-4.5-3-7z" fill="#FFF2B2" stroke="#C7851F" strokeWidth="2.2" />
          <rect x="26" y="40" width="12" height="8" rx="2" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
          <path d="M28 51h8" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'cable':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="24" y="13" width="16" height="11" rx="2" fill="#FFFFFF" stroke="#334155" strokeWidth="2.1" />
          <rect x="27" y="24" width="10" height="8" rx="2" fill="#365FE8" stroke="#1E40AF" strokeWidth="1.8" />
          <path d="M32 32v9c0 5-8 5-8 10" fill="none" stroke="#334155" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case 'battery':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="21" y="16" width="22" height="34" rx="4" fill="#FFFFFF" stroke="#C7851F" strokeWidth="2.2" />
          <rect x="27" y="11" width="10" height="5" rx="1.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.8" />
          <rect x="21" y="16" width="22" height="14" rx="4" fill="#E5A23B" stroke="#C7851F" strokeWidth="2" />
          <path d="M32 20v6M29 23h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'vitamin':
    case 'bandage':
      return (
        <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
          <rect x="19" y="18" width="26" height="32" rx="5" fill="#FFFFFF" stroke="#D9534F" strokeWidth="2.2" />
          <rect x="22" y="12" width="20" height="6" rx="2" fill="#FDE2E1" stroke="#D9534F" strokeWidth="1.8" />
          <path d="M32 28v12M26 34h12" stroke="#D9534F" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <div className="w-11 h-11 rounded-xl bg-white/95 border border-[#E7EAF0] shadow-xs flex items-center justify-center text-[#4B5565]">
          <CategoryIcon iconKey={fallbackIconKey} className="w-6 h-6" strokeWidth={1.9} />
        </div>
      );
  }
}

export function getProductArtwork(
  name: string,
  category: string,
  fallbackIconKey?: string
): ProductArtworkSpec {
  const key = resolveArtworkKey(name, category);
  return {
    key,
    bgClass: ARTWORK_BACKDROPS[key] ?? ARTWORK_BACKDROPS.generic,
    renderSvg: () => renderVectorByKey(key, fallbackIconKey),
  };
}
