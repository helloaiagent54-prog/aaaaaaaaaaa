export interface LocalAreaOption {
  code: string;
  name: string;
}

export interface UpazilaOption {
  code: string;
  name: string;
  areas: LocalAreaOption[];
}

export interface DistrictOption {
  code: string;
  name: string;
  zone: 'dhaka_metro' | 'dhaka_suburb' | 'outside_dhaka';
  upazilas: UpazilaOption[];
}

export interface DivisionOption {
  code: string;
  name: string;
  districts: DistrictOption[];
}

export const BANGLADESH_LOCATIONS: DivisionOption[] = [
  {
    code: 'DHA',
    name: 'Dhaka',
    districts: [
      {
        code: 'DHA-DHK',
        name: 'Dhaka',
        zone: 'dhaka_metro',
        upazilas: [
          {
            code: 'DHK-DMD',
            name: 'Dhanmondi',
            areas: [
              { code: 'DMD-W15', name: 'Ward 15 (Dhanmondi Lake & Satmasjid)' },
              { code: 'DMD-KAL', name: 'Kalabagan' },
              { code: 'DMD-JIG', name: 'Jigatola' },
            ],
          },
          {
            code: 'DHK-GUL',
            name: 'Gulshan',
            areas: [
              { code: 'GUL-1', name: 'Gulshan 1 (Ward 19)' },
              { code: 'GUL-2', name: 'Gulshan 2' },
              { code: 'GUL-BAN', name: 'Banani' },
              { code: 'GUL-BAR', name: 'Baridhara' },
            ],
          },
          {
            code: 'DHK-MIR',
            name: 'Mirpur',
            areas: [
              { code: 'MIR-1', name: 'Mirpur 1' },
              { code: 'MIR-10', name: 'Mirpur 10 (Ward 03)' },
              { code: 'MIR-11', name: 'Mirpur 11 & Pallabi' },
              { code: 'MIR-12', name: 'Mirpur 12' },
            ],
          },
          {
            code: 'DHK-UTT',
            name: 'Uttara',
            areas: [
              { code: 'UTT-S1', name: 'Sector 1 - Sector 4' },
              { code: 'UTT-S7', name: 'Sector 7 & Sector 9' },
              { code: 'UTT-S11', name: 'Sector 10 - Sector 14' },
            ],
          },
          {
            code: 'DHK-MOT',
            name: 'Motijheel',
            areas: [
              { code: 'MOT-W9', name: 'Ward 09 (Motijheel Commercial)' },
              { code: 'MOT-PAL', name: 'Paltan & Fakirapool' },
            ],
          },
          {
            code: 'DHK-SAV',
            name: 'Savar',
            areas: [
              { code: 'SAV-PAU', name: 'Savar Pourashava' },
              { code: 'SAV-ASH', name: 'Ashulia Union' },
              { code: 'SAV-BIR', name: 'Birulia Union' },
            ],
          },
        ],
      },
      {
        code: 'DHA-GAZ',
        name: 'Gazipur',
        zone: 'dhaka_suburb',
        upazilas: [
          {
            code: 'GAZ-SAD',
            name: 'Gazipur Sadar',
            areas: [
              { code: 'GAZ-JOY', name: 'Joydebpur Pourashava' },
              { code: 'GAZ-TON', name: 'Tongi East & West' },
            ],
          },
          {
            code: 'GAZ-KAL',
            name: 'Kaliakair',
            areas: [
              { code: 'KAL-PAU', name: 'Kaliakair Pourashava' },
              { code: 'KAL-MOU', name: 'Mouchak Union' },
            ],
          },
        ],
      },
      {
        code: 'DHA-NAR',
        name: 'Narayanganj',
        zone: 'dhaka_suburb',
        upazilas: [
          {
            code: 'NAR-SAD',
            name: 'Narayanganj Sadar',
            areas: [
              { code: 'NAR-CHA', name: 'Chashara' },
              { code: 'NAR-FAT', name: 'Fatullah Union' },
            ],
          },
          {
            code: 'NAR-SON',
            name: 'Sonargaon',
            areas: [
              { code: 'SON-MOG', name: 'Mograpara Union' },
              { code: 'SON-KAC', name: 'Kanchpur Union' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'CTG',
    name: 'Chattogram',
    districts: [
      {
        code: 'CTG-CTG',
        name: 'Chattogram',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'CTG-KOT',
            name: 'Kotwali',
            areas: [
              { code: 'KOT-AND', name: 'Anderkilla (Ward 32)' },
              { code: 'KOT-JAM', name: 'Jamal Khan (Ward 21)' },
            ],
          },
          {
            code: 'CTG-PAN',
            name: 'Panchlaish',
            areas: [
              { code: 'PAN-NAS', name: 'Nasirabad Housing' },
              { code: 'PAN-GEC', name: 'GEC Circle & O.R. Nizam' },
            ],
          },
          {
            code: 'CTG-AGR',
            name: 'Double Mooring (Agrabad)',
            areas: [
              { code: 'AGR-COM', name: 'Agrabad C/A' },
              { code: 'AGR-HAL', name: 'Halishahar' },
            ],
          },
        ],
      },
      {
        code: 'CTG-COX',
        name: "Cox's Bazar",
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'COX-SAD',
            name: "Cox's Bazar Sadar",
            areas: [
              { code: 'COX-KOL', name: 'Kolatoli & Marine Drive' },
              { code: 'COX-PAU', name: 'Pourashava Central' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'SYL',
    name: 'Sylhet',
    districts: [
      {
        code: 'SYL-SYL',
        name: 'Sylhet',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'SYL-SAD',
            name: 'Sylhet Sadar',
            areas: [
              { code: 'SYL-ZIN', name: 'Zindabazar & Amberkhana' },
              { code: 'SYL-SHA', name: 'Shahjalal Upashahar' },
            ],
          },
          {
            code: 'SYL-BEA',
            name: 'Beanibazar',
            areas: [
              { code: 'BEA-PAU', name: 'Beanibazar Pourashava' },
              { code: 'BEA-LAU', name: 'Lauta Union' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'RAJ',
    name: 'Rajshahi',
    districts: [
      {
        code: 'RAJ-RAJ',
        name: 'Rajshahi',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'RAJ-BOA',
            name: 'Boalia',
            areas: [
              { code: 'BOA-SAH', name: 'Shaheb Bazar' },
              { code: 'BOA-PAD', name: 'Padma Residential' },
            ],
          },
          {
            code: 'RAJ-MOT',
            name: 'Motihar',
            areas: [
              { code: 'MOT-KAZ', name: 'Kazla & RU Campus' },
              { code: 'MOT-BIN', name: 'Binodpur' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'KHL',
    name: 'Khulna',
    districts: [
      {
        code: 'KHL-KHL',
        name: 'Khulna',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'KHL-SON',
            name: 'Sonadanga',
            areas: [
              { code: 'SON-SHI', name: 'Shib Bari' },
              { code: 'SON-NIR', name: 'Nirala Residential' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'BAR',
    name: 'Barishal',
    districts: [
      {
        code: 'BAR-BAR',
        name: 'Barishal',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'BAR-SAD',
            name: 'Barishal Sadar',
            areas: [
              { code: 'BAR-ALE', name: 'Alekanda & Sadar Road' },
              { code: 'BAR-RUP', name: 'Rupatoli' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'RNG',
    name: 'Rangpur',
    districts: [
      {
        code: 'RNG-RNG',
        name: 'Rangpur',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'RNG-SAD',
            name: 'Rangpur Sadar',
            areas: [
              { code: 'RNG-JAH', name: 'Jahaj Company More' },
              { code: 'RNG-DHN', name: 'Dhap & Medical More' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'MYM',
    name: 'Mymensingh',
    districts: [
      {
        code: 'MYM-MYM',
        name: 'Mymensingh',
        zone: 'outside_dhaka',
        upazilas: [
          {
            code: 'MYM-SAD',
            name: 'Mymensingh Sadar',
            areas: [
              { code: 'MYM-GAN', name: 'Ganginar Par & Charpara' },
              { code: 'MYM-MAS', name: 'Maskanda' },
            ],
          },
        ],
      },
    ],
  },
];

export interface ValidatedHierarchy {
  valid: boolean;
  divisionName?: string;
  districtName?: string;
  upazilaName?: string;
  areaName?: string;
  zone?: 'dhaka_metro' | 'dhaka_suburb' | 'outside_dhaka';
}

export function validateBangladeshHierarchy(input: {
  divisionCode: string;
  districtCode: string;
  upazilaCode: string;
  areaCode: string;
}): ValidatedHierarchy {
  const division = BANGLADESH_LOCATIONS.find((d) => d.code === input.divisionCode);
  if (!division) return { valid: false };
  const district = division.districts.find((dist) => dist.code === input.districtCode);
  if (!district) return { valid: false };
  const upazila = district.upazilas.find((u) => u.code === input.upazilaCode);
  if (!upazila) return { valid: false };
  const area = upazila.areas.find((a) => a.code === input.areaCode);
  if (!area) return { valid: false };

  return {
    valid: true,
    divisionName: division.name,
    districtName: district.name,
    upazilaName: upazila.name,
    areaName: area.name,
    zone: district.zone,
  };
}
