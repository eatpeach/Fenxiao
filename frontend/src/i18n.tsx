import { createContext, useContext, useState, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import idID from 'antd/locale/id_ID';

export type Lang = 'zh' | 'id';
const KEY = 'fenxiao_lang';

// key: [中文, Bahasa Indonesia]
const dict: Record<string, [string, string]> = {
  login_title: ['茗寳集 分销系统', 'Sistem Distribusi MING BAO JI'],
  login_sub: ['烟 · 酒 · 茶 · 茶具 · 特产 分销平台', 'Distribusi Rokok · Arak · Teh · Perkakas · Oleh-oleh'],
  username: ['用户名', 'Nama pengguna'],
  password: ['密码', 'Kata sandi'],
  login_btn: ['登 录', 'Masuk'],
  login_ok: ['登录成功', 'Berhasil masuk'],
  login_fail: ['用户名或密码错误', 'Nama pengguna atau kata sandi salah'],
  please_username: ['请输入用户名', 'Masukkan nama pengguna'],
  please_password: ['请输入密码', 'Masukkan kata sandi'],
  slogan1: ['正品保障', 'Produk Asli'],
  slogan2: ['全球甄选', 'Pilihan Global'],
  slogan3: ['一件代发', 'Dropship'],

  m_dashboard: ['仪表盘', 'Dasbor'],
  m_products: ['商品管理', 'Produk'],
  m_categories: ['商品分类', 'Kategori'],
  m_suppliers: ['供应商', 'Pemasok'],
  m_distributors: ['分销商', 'Distributor'],
  m_levels: ['分销等级', 'Level Distributor'],
  m_orders: ['订单管理', 'Pesanan'],
  m_payments: ['收款审核', 'Verifikasi Pembayaran'],
  m_receivables: ['应收催收', 'Piutang'],
  m_commissions: ['佣金结算', 'Komisi'],
  m_withdrawals: ['提现管理', 'Penarikan'],
  m_accounts: ['账号管理', 'Akun'],
  logout: ['退出登录', 'Keluar'],
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
}
const Ctx = createContext<I18nCtx>(null as any);
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>((localStorage.getItem(KEY) as Lang) || 'zh');
  const setLang = (l: Lang) => { localStorage.setItem(KEY, l); setLangState(l); };
  const t = (k: string) => (dict[k] ? dict[k][lang === 'id' ? 1 : 0] : k);
  return (
    <Ctx.Provider value={{ lang, setLang, t }}>
      <ConfigProvider locale={lang === 'id' ? idID : zhCN}>{children}</ConfigProvider>
    </Ctx.Provider>
  );
}
