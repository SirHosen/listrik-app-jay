import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import {
  Users,
  FileText,
  Banknote,
  Clock,
  Zap,
  CreditCard,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [customersRes, billsRes, paymentsRes, readingsRes] = await Promise.all([
          api.get('/customers'),
          api.get('/bills'),
          api.get('/payments'),
          api.get('/meter-readings')
        ]);

        const bills = billsRes.data.data?.bills || [];
        const payments = paymentsRes.data.data?.payments || [];
        const readings = readingsRes.data.data?.readings || [];
        
        setStats({
          totalCustomers: customersRes.data.data.customers?.length || 0,
          activeCustomers: customersRes.data.data.customers?.filter(c => c.status === 'active').length || 0,
          totalBills: bills.length,
          unpaidBills: bills.filter(b => b.status === 'unpaid').length,
          totalRevenue: payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + parseFloat(p.amount), 0),
          pendingPayments: payments.filter(p => p.status === 'pending').length,
          totalReadings: readings.length
        });
      } else {
        const [billsRes, usageRes, paymentsRes] = await Promise.all([
          api.get('/bills'),
          api.get('/meter-readings'),
          api.get('/payments')
        ]);

        const bills = billsRes.data.data?.bills || [];
        const readings = usageRes.data.data?.readings || [];
        const payments = paymentsRes.data.data?.payments || [];

        const totalUsage = readings.reduce((sum, r) => sum + (r.usage_kwh || 0), 0);
        const unpaidBills = bills.filter(b => b.status === 'unpaid');

        setStats({
          totalBills: bills.length,
          unpaidBills: unpaidBills.length,
          totalUnpaid: unpaidBills.reduce((sum, b) => sum + parseFloat(b.total_amount), 0),
          totalUsage: totalUsage,
          totalPayments: payments.filter(p => p.status === 'verified').length,
          lastReading: readings[0]
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={isAdmin ? 'Dashboard Admin' : `Selamat Datang, ${user?.customer?.full_name || 'User'}`}
        subtitle={isAdmin ? 'Ringkasan sistem manajemen listrik' : 'Ringkasan akun listrik Anda'}
      />

      {isAdmin ? (
        <>
          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pelanggan</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalCustomers || 0}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats?.activeCustomers || 0} Aktif
                  </p>
                </div>
                <div className="bg-blue-100 p-4 rounded-2xl">
                  <Users className="text-blue-600" size={32} />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tagihan</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalBills || 0}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {stats?.unpaidBills || 0} Belum Dibayar
                  </p>
                </div>
                <div className="bg-purple-100 p-4 rounded-2xl">
                  <FileText className="text-purple-600" size={32} />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats?.totalRevenue || 0)}</p>
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Terverifikasi
                  </p>
                </div>
                <div className="bg-green-100 p-4 rounded-2xl">
                  <Banknote className="text-green-600" size={32} />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pembayaran Pending</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.pendingPayments || 0}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Perlu Verifikasi
                  </p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-2xl">
                  <Clock className="text-yellow-600" size={32} />
                </div>
              </div>
            </Card>
          </div>

          {/* Additional Admin Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Ringkasan Sistem">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="text-gray-600" size={20} />
                    <span className="text-sm font-medium">Pelanggan Aktif</span>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{stats?.activeCustomers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-gray-600" size={20} />
                    <span className="text-sm font-medium">Tagihan Belum Dibayar</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">{stats?.unpaidBills || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="text-gray-600" size={20} />
                    <span className="text-sm font-medium">Total Pencatatan Meter</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats?.totalReadings || 0}</span>
                </div>
              </div>
            </Card>

            <Card title="Aksi Cepat">
              <div className="space-y-3">
                <a
                  href="/customers"
                  className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="text-primary-600" size={24} />
                    <div>
                      <div className="font-semibold text-gray-900">Kelola Pelanggan</div>
                      <div className="text-sm text-gray-600">Tambah, edit, atau hapus data pelanggan</div>
                    </div>
                  </div>
                </a>
                <a
                  href="/bills"
                  className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="text-purple-600" size={24} />
                    <div>
                      <div className="font-semibold text-gray-900">Generate Tagihan</div>
                      <div className="text-sm text-gray-600">Buat tagihan baru untuk bulan ini</div>
                    </div>
                  </div>
                </a>
                <a
                  href="/payments"
                  className="block p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="text-yellow-600" size={24} />
                    <div>
                      <div className="font-semibold text-gray-900">Verifikasi Pembayaran</div>
                      <div className="text-sm text-gray-600">{stats?.pendingPayments || 0} pembayaran menunggu</div>
                    </div>
                  </div>
                </a>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tagihan Belum Bayar</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats?.unpaidBills || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(stats?.totalUnpaid || 0)}
                  </p>
                </div>
                <div className="bg-red-100 p-4 rounded-2xl">
                  <AlertCircle className="text-red-600" size={32} />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pemakaian</p>
                  <p className="text-3xl font-bold text-primary-600 mt-2">{stats?.totalUsage || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">kWh</p>
                </div>
                <div className="bg-primary-100 p-4 rounded-2xl">
                  <Zap className="text-primary-600" size={32} />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pembayaran Sukses</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats?.totalPayments || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Transaksi</p>
                </div>
                <div className="bg-green-100 p-4 rounded-2xl">
                  <CreditCard className="text-green-600" size={32} />
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tagihan</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.totalBills || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Semua Status</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-2xl">
                  <FileText className="text-blue-600" size={32} />
                </div>
              </div>
            </Card>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Informasi Akun">
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">ID Pelanggan</span>
                  <span className="font-mono font-semibold">{user?.customer?.customer_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Nama Lengkap</span>
                  <span className="font-semibold">{user?.customer?.full_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Daya Terpasang</span>
                  <span className="font-semibold">{user?.customer?.power_capacity} VA</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {user?.customer?.status === 'active' ? 'Aktif' : 'Non-aktif'}
                  </span>
                </div>
              </div>
            </Card>

            <Card title="Aksi Cepat">
              <div className="space-y-3">
                <a
                  href="/my-bills"
                  className="block p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="text-red-600" size={24} />
                    <div>
                      <div className="font-semibold text-gray-900">Tagihan Saya</div>
                      <div className="text-sm text-gray-600">Lihat dan bayar tagihan listrik</div>
                    </div>
                  </div>
                </a>
                <a
                  href="/usage"
                  className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="text-primary-600" size={24} />
                    <div>
                      <div className="font-semibold text-gray-900">Riwayat Pemakaian</div>
                      <div className="text-sm text-gray-600">Monitor pemakaian listrik Anda</div>
                    </div>
                  </div>
                </a>
                <a
                  href="/payment-history"
                  className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-green-600" size={24} />
                    <div>
                      <div className="font-semibold text-gray-900">Riwayat Pembayaran</div>
                      <div className="text-sm text-gray-600">Lihat histori transaksi pembayaran</div>
                    </div>
                  </div>
                </a>
              </div>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}
