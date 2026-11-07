export interface NrcState {
  code: string;
  label: string;
  name: string;
}

export interface NrcCitizenType {
  code: string;
  label: string;
}

export const NRC_STATES: NrcState[] = [
  { code: '1', label: '1/', name: 'Kachin' },
  { code: '2', label: '2/', name: 'Kayah' },
  { code: '3', label: '3/', name: 'Kayin' },
  { code: '4', label: '4/', name: 'Chin' },
  { code: '5', label: '5/', name: 'Sagaing' },
  { code: '6', label: '6/', name: 'Tanintharyi' },
  { code: '7', label: '7/', name: 'Bago' },
  { code: '8', label: '8/', name: 'Magway' },
  { code: '9', label: '9/', name: 'Mandalay' },
  { code: '10', label: '10/', name: 'Mon' },
  { code: '11', label: '11/', name: 'Rakhine' },
  { code: '12', label: '12/', name: 'Yangon' },
  { code: '13', label: '13/', name: 'Shan' },
  { code: '14', label: '14/', name: 'Ayeyarwady' },
];

export const NRC_CITIZEN_TYPES: NrcCitizenType[] = [
  { code: '(N)', label: '(N) Citizen' },
 // { code: '(P)', label: '(P) Associate' },
 // { code: '(E)', label: '(E) Naturalized' },
];

export const NRC_TOWNSHIPS: Record<string, string[]> = {
 '1': [
  'BAMANA',   // ဗန်းမော်
  'KHAPHANA', // ချီဖွေ
  'DAPHAYA',  // ဒေါ့ဖုန်းယန်
  'HAPANA',   // ဟိုပင်
  'PHAKANA',  // ဖားကန့်
  'AHGAYA',   // အင်ဂျန်းယန်
  'KAMATA',   // ကာမိုင်း
  'KAPATA',   // ကန်ပိုက်တီ
  'KHALAPHA', // ခေါင်လန်ဖူး
  'LAGANA',   // လွယ်ဂျယ်
  'MAKHABA',  // မချမ်းဘော
  'MASANA',   // မံစီ
  'MAKATA',   // မိုးကောင်း
  'MANYANA',  // မိုးညှင်း
  'MAMANA',   // မိုးမောက်
  'MAKANA',   // မြစ်ကြီးနား
  'MALANA',   // မြို့လှ
  'NAMANA',   // နောင်မွန်
  'PAWANA',   // ပန်ဝါ
  'PANADA',   // ပန်နန်းဒင်
  'PATAAH',   // ပူတာအို
  'SADANA',   // ဆဒုံး
  'YABAYA',   // ရှင်ဗွေယန်
  'YAKANA',   // ရွှေကူ
  'SABANA'    // ဆင်ဘို
],
  '2': [
  'LAKANA',  // လွိုင်ကော်
  'DAMASA',  // ဒီးမော့ဆို
  'PHARASO', // ဖရူဆို
  'YATANA',  // ရှားတော
  'BALAKHA', // ဘော်လခဲ
  'MASANA',  // မယ်စဲ့
  'PHASANA'  // ဖားဆောင်း
],
  '3': [
  'BAGALA',
  'LABANA',
  'BAAHNA',
  'KAMAMA',
  'KAKARA',
  'KASAKA',
  'LATHANA',
  'MAWATA',
  'BATHASA',
  'PAKANA',
  'PHAPANA',
  'YAYATHA',
  'SAKALA',
  'THATAKA',
  'THATANA',
  'WALAMA'
],
  '4': [
  'KAKHANA',
  'SAMANA',
  'YAKHADA',
  'YAZANA',
  'PHALANA',
  'HAKHANA',
  'KAPALA',
  'MATAPA',
  'MATANA',
  'PALAWA',
  'HTATALA',
  'TATANA',
  'TAZANA'
],
  '5': [
  'AHYATA',
  'BAMANA',
  'BATALA',
  'KHAOUTA',
  'KHATANA',
  'HAMALA',
  'AHTANA',
  'KALAHTA',
  'KALAWA',
  'KABALA',
  'KANANA',
  'KATHANA',
  'KAKANA',
  'KAPANA',
  'MAMANA',
  'MAYANA',
  'MONANA',
  'NAYANA',
  'PAKANA',
  'PALANA',
  'SAGANA',
  'SHABANA',
  'TABAYA',
  'TAMANA',
  'YAMANA'
],
  '6': [
  'HTAWANA',
  'BAPANA',
  'KALAAH',
  'KATHANA',
  'PALANA'
],
  '7': [
  'PAKHANA',
  'DAOUNA',
  'KAKATA',
  'KAWANA',
  'NYALAPA',
  'THATAPA',
  'HTATAPA',
  'THAKANA',
  'WAMANA',
  'PANAKA'
],
  '8': [
  'MAKANA',
  'NAMANA',
  'MATHANA',
  'TATAKA',
  'YANAKHA',
  'KHAMANA',
  'MABANA',
  'PAPHANA',
  'NGAPHANA',
  'SALANA',
  'SATARA',
  'GAGANA',
  'HTALANA',
  'SAMANA',
  'THAYANA',
  'SAPAWA',
  'MATANA',
  'AHLANA',
  'MALANA',
  'KAMANA',
  'PAKHAKU',
  'SAPHANA',
  'PAMANA',
  'MAMANA',
  'YASAKA'
],
  '9': [
  'AHMAYA',
  'AHMAZA',
  'KHAMASA',
  'KHAMANA',
  'KHAMAYA',
  'KHAMATA',
  'KHAMAYA',
  'MAMANA',
  'MAYANA',
  'MAPANA',
  'PATANA',
  'SAGANA',
  'TAMANA',
  'YAMANA'
],
  '10': [
  'LAMANA',
  'MAMANA',
  'MAMATA',
  'MAMAYA',
  'MAYANA',
  'NAMANA',
  'PANANA',
  'THAHANA',
  'THAPHAYA',
  'YAMANA'
],
  '11': [
  'AHMANA',
  'KAMANA',
  'KATANA',
  'KATALA',
  'MAMANA',
  'MAMATA',
  'MATHANA',
  'PANATA',
  'PATANA',
  'SABANA',
  'SATANA',
  'THATANA'
],
  '12': [
  'AHLANA',
  'BAMANA',
  'DAGANA',
  'DAGAYA',
  'DAGAMA',
  'DAGASA',
  'KAKAKA',
  'KAKHAKA',
  'KAMAYA',
  'KHAYANA',
  'MAMANA',
  'MAYATA',
  'OUKAMA',
  'SAKHANA',
  'SAKANA',
  'TAKANA'
],
  '13': [
  'AHMANA',
  'AHNANA',
  'AHPANA',
  'AHTHAYA',
  'KAKANA',
  'KAKHANA',
  'KAMANA',
  'LAMANA',
  'MAMANA',
  'MAMATA',
  'NAMANA',
  'PANANA',
  'TAMANA',
  'YAMANA'
],
  '14': [
  'AHMATA',
  'DANAPHA',
  'DADAYA',
  'KAKANA',
  'KAMANA',
  'LAMANA',
  'MAMANA',
  'PANANA',
  'PATANA',
  'THAPANA',
  'YAMANA'
],
};
