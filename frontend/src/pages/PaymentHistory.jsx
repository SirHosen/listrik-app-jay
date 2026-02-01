import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { History, CheckCircle, XCircle, Clock } from 'lucide-react';
import Table from '../components/Table';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { formatCurrency } from '../utils/helpers';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments');
      const paymentData = res.data.data?.payments;
      setPayments(Array.isArray(paymentData) ? paymentData : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil riwayat pembayaran');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Tanggal Bayar',
      field: 'payment_date',
      render: (row) => <span className="font-medium">{new Date(row.payment_date).toLocaleDateString('id-ID', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}</span>
    },
    {
      header: 'Nomor Tagihan',
      field: 'bill',
      render: (row) => (
        <div>
          <div className="font-mono text-sm font-semibold">{row.bill_number}</div>
          <div className="text-xs text-gray-500">{row.bill_month}</div>
        </div>
      )
    },
    {
      header: 'Jumlah',
      field: 'amount',
      render: (row) => <span className="font-bold text-lg text-gray-900">{formatCurrency(row.amount)}</span>
    },
    {
      header: 'Metode',
      field: 'payment_method',
      render: (row) => (
        <Badge variant="info">
          {row.payment_method === 'cash' ? 'Tunai' : 'Transfer Bank'}
        </Badge>
      )
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => {
        const statusConfig = {
          verified: { variant: 'success', icon: CheckCircle, label: 'Terverifikasi' },
          pending: { variant: 'warning', icon: Clock, label: 'Menunggu Verifikasi' },
          rejected: { variant: 'danger', icon: XCircle, label: 'Ditolak' }
        };
        const config = statusConfig[row.status];
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} className={`${row.status === 'verified' ? 'text-green-600' : row.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`} />
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        );
      }
    }
  ];

  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const rejectedPayments = payments.filter(p => p.status === 'rejected');
  const totalPaid = verifiedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <Layout>
      <PageHeader
        title="Riwayat Pembayaran"
        subtitle="Lihat semua riwayat pembayaran listrik Anda"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-gray-500">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-3 rounded-lg">
              <History className="text-gray-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Transaksi</div>
              <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Terverifikasi</div>
              <div className="text-2xl font-bold text-green-600">{verifiedPayments.length}</div>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</div>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-primary-500">
          <div>
            <div className="text-sm text-gray-600">Total Terbayar</div>
            <div className="text-xl font-bold text-primary-600 mt-1">{formatCurrency(totalPaid)}</div>
          </div>
        </Card>
      </div>

      <Table
        columns={columns}
        data={payments}
        loading={loading}
      />

      {payments.length === 0 && !loading && (
        <div className="text-center py-12">
          <History className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-500 text-lg">Belum ada riwayat pembayaran</p>
        </div>
      )}
    </Layout>
  );
}
