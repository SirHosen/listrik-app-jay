import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Check, X, Search } from 'lucide-react';
import Table from '../components/Table';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { formatCurrency } from '../utils/helpers';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '' });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      const res = await api.get(`/payments?${params.toString()}`);
      const paymentData = res.data.data?.payments;
      setPayments(Array.isArray(paymentData) ? paymentData : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data pembayaran');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id, status) => {
    const message = status === 'verified' ? 'verifikasi' : 'tolak';
    if (!confirm(`Yakin ingin ${message} pembayaran ini?`)) return;
    
    try {
      await api.put(`/payments/${id}/verify`, { status });
      toast.success(`Pembayaran berhasil di${message}`);
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || `Gagal ${message} pembayaran`);
    }
  };

  const columns = [
    {
      header: 'Tanggal',
      field: 'payment_date',
      render: (row) => <span className="font-medium">{new Date(row.payment_date).toLocaleDateString('id-ID')}</span>
    },
    {
      header: 'Pelanggan',
      field: 'bill',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name}</div>
          <div className="text-xs text-gray-500">{row.customer_number}</div>
        </div>
      )
    },
    {
      header: 'Nomor Tagihan',
      field: 'bill_number',
      render: (row) => <span className="font-mono text-sm">{row.bill_number}</span>
    },
    {
      header: 'Jumlah',
      field: 'amount',
      render: (row) => <span className="font-bold text-lg text-primary-600">{formatCurrency(row.amount)}</span>
    },
    {
      header: 'Metode',
      field: 'payment_method',
      render: (row) => (
        <Badge variant="info">
          {row.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
        </Badge>
      )
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => {
        const variants = {
          pending: 'warning',
          verified: 'success',
          rejected: 'danger'
        };
        const labels = {
          pending: 'Pending',
          verified: 'Terverifikasi',
          rejected: 'Ditolak'
        };
        return (
          <Badge variant={variants[row.status]}>
            {labels[row.status]}
          </Badge>
        );
      }
    }
  ];

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    verified: payments.filter(p => p.status === 'verified').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    totalAmount: payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + parseFloat(p.amount), 0)
  };

  return (
    <Layout>
      <PageHeader
        title="Verifikasi Pembayaran"
        subtitle="Manajemen dan verifikasi pembayaran pelanggan"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Terverifikasi</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.verified}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Ditolak</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Total Terkonfirmasi</div>
          <div className="text-xl font-bold text-primary-600 mt-1">{formatCurrency(stats.totalAmount)}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari pelanggan atau nomor tagihan..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Terverifikasi</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={payments}
        loading={loading}
        actions={(row) => (
          row.status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="success"
                icon={Check}
                onClick={() => handleVerify(row.id, 'verified')}
              >
                Verifikasi
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={X}
                onClick={() => handleVerify(row.id, 'rejected')}
              >
                Tolak
              </Button>
            </>
          ) : (
            <Badge variant={row.status === 'verified' ? 'success' : 'danger'}>
              {row.status === 'verified' ? 'Sudah Diverifikasi' : 'Ditolak'}
            </Badge>
          )
        )}
      />
    </Layout>
  );
}
