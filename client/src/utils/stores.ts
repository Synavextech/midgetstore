import { ChinaStore } from '../types'

export const CHINA_STORES: ChinaStore[] = [
  {
    id: 'store_cn_sz_01',
    code: 'CN-SZX',
    name: 'Shenzhen Technology & Electric Mobility Hub',
    city: 'Shenzhen',
    province: 'Guangdong',
    district: 'Nanshan District',
    address: 'High-Tech Industrial Park, Nanshan District, Shenzhen, Guangdong, China',
    postalCode: '518057',
    phone: '+86 755 8832 9900',
    email: 'shenzhen-hub@midgetdriftcarsandebikes.shop',
    type: 'Headquarters, R&D & Central Dispatch',
    leadTime: '21-35 business days (Global Express Air & Courier)',
    isActive: true,
    isPrimary: true
  },
  {
    id: 'store_cn_gz_02',
    code: 'CN-CAN',
    name: 'Guangzhou Greater Bay Logistics Center',
    city: 'Guangzhou',
    province: 'Guangdong',
    district: 'Baiyun District',
    address: 'Airport International Logistics Park, Baiyun District, Guangzhou, Guangdong, China',
    postalCode: '510405',
    phone: '+86 20 8612 8840',
    email: 'guangzhou-hub@midgetdriftcarsandebikes.shop',
    type: 'Air Freight & Sea Cargo Export Terminal',
    leadTime: '21-35 business days (Express Air Cargo Dispatch)',
    isActive: true,
    isPrimary: false
  },
  {
    id: 'store_cn_yw_03',
    code: 'CN-YIW',
    name: 'Yiwu Micro-Rides International Distribution Hub',
    city: 'Yiwu',
    province: 'Zhejiang',
    district: 'Beiyuan District',
    address: 'Chouzhou North Road International Trade City Zone, Yiwu, Zhejiang, China',
    postalCode: '322000',
    phone: '+86 579 8556 7720',
    email: 'yiwu-hub@midgetdriftcarsandebikes.shop',
    type: 'International Cross-Border Distribution Hub',
    leadTime: '21-35 business days (Cross-Border Express Dispatch)',
    isActive: true,
    isPrimary: false
  },
  {
    id: 'store_cn_sh_04',
    code: 'CN-SHA',
    name: 'Shanghai Flagship Mobility Showroom & Depot',
    city: 'Shanghai',
    province: 'Shanghai',
    district: 'Pudong New Area',
    address: 'Zhangjiang High-Tech Park, Pudong New Area, Shanghai, China',
    postalCode: '201203',
    phone: '+86 21 6889 1200',
    email: 'shanghai-depot@midgetdriftcarsandebikes.shop',
    type: 'Flagship Showroom & Performance Tuning Depot',
    leadTime: '21-35 business days (Air Express Priority Dispatch)',
    isActive: true,
    isPrimary: false
  },
  {
    id: 'store_cn_nb_05',
    code: 'CN-NGB',
    name: 'Ningbo Maritime Port Hub',
    city: 'Ningbo',
    province: 'Zhejiang',
    district: 'Beilun District',
    address: 'Beilun Port Free Trade Logistics Zone, Ningbo, Zhejiang, China',
    postalCode: '315800',
    phone: '+86 574 8678 3310',
    email: 'ningbo-hub@midgetdriftcarsandebikes.shop',
    type: 'Deep-Sea Maritime Export & Heavy Freight Depot',
    leadTime: '21-35 business days (Deep-Sea & Ocean Freight Dispatch)',
    isActive: true,
    isPrimary: false
  }
]

export const getDefaultStore = (): ChinaStore => CHINA_STORES[0]
export const getStoreById = (id: string): ChinaStore => CHINA_STORES.find(s => s.id === id || s.code === id) || getDefaultStore()

