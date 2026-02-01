import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FileText, Search, Calendar, Plus } from 'lucide-react';
import Table from '../components/Table';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { formatCurrency } from '../utils/helpers';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', month: '' });

  useEffect(() => {
    fetchBills();
    fetchCustomers();
  }, [filters]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.month) params.append('bill_month', filters.month);
      const res = await api.get(`/bills?${params.toString()}`);
      const billData = res.data.data?.bills;
      setBills(Array.isArray(billData) ? billData : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data tagihan');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers?status=active');
      const customerData = res.data.data?.customers;
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (error) {
      console.error(error);
      setCustomers([]);
    }
  };

  const handleGenerateBills = async () => {
    if (!confirm('Generate tagihan untuk bulan ini?')) return;
    setGenerating(true);
    try {
      const res = await api.post('/bills/generate-bulk');
      toast.success(res.data.message || 'Tagihan berhasil digenerate');
      if (res.data.data?.failed_count > 0) {
        console.warn('Some bills failed to generate:', res.data.data.errors);
      }
      fetchBills();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal generate tagihan');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    {
      header: 'Nomor Tagihan',
      field: 'bill_number',
      render: (row) => <span className="font-mono text-sm font-semibold">{row.bill_number}</span>
    },
    {
      header: 'Pelanggan',
      field: 'customer',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name}</div>
          <div className="text-xs text-gray-500">{row.customer_number}</div>
        </div>
      )
    },
    {
      header: 'Periode',
      field: 'billing_period',
      render: (row) => <span className="text-sm">{row.bill_month}</span>
    },
    {
      header: 'Pemakaian',
      field: 'usage_kwh',
      render: (row) => <span className="font-semibold">{row.usage_kwh} kWh</span>
    },
    {
      header: 'Total Tagihan',
      field: 'total_amount',
      render: (row) => <span className="font-bold text-lg text-primary-600">{formatCurrency(row.total_amount)}</span>
    },
    {
      header: 'Jatuh Tempo',
      field: 'due_date',
      render: (row) => {
        const dueDate = new Date(row.due_date);
        const isOverdue = dueDate < new Date() && row.status !== 'paid';
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
            {dueDate.toLocaleDateString('id-ID')}
          </span>
        );
      }
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => (
        <Badge variant={row.status === 'paid' ? 'success' : row.status === 'overdue' ? 'danger' : 'warning'}>
          {row.status === 'paid' ? 'Lunas' : row.status === 'overdue' ? 'Terlambat' : 'Belum Bayar'}
        </Badge>
      )
    }
  ];

  const stats = {
    total: bills.length,
    paid: bills.filter(b => b.status === 'paid').length,
    unpaid: bills.filter(b => b.status === 'unpaid').length,
    totalRevenue: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
  };

  return (
    <Layout>
      <PageHeader
        title="Kelola Tagihan"
        subtitle="Manajemen tagihan listrik pelanggan"
        action={
          <Button icon={Plus} onClick={handleGenerateBills} loading={generating}>
            Generate Tagihan Bulan Ini
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-sm text-gray-600">Total Tagihan</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Lunas</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.paid}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Belum Bayar</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.unpaid}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Total Pendapatan</div>
          <div className="text-2xl font-bold text-primary-600 mt-1">{formatCurrency(stats.totalRevenue)}</div>
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
            <option value="unpaid">Belum Bayar</option>
            <option value="overdue">Terlambat</option>
            <option value="paid">Lunas</option>
          </select>
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={bills}
        loading={loading}
      />
    </Layout>
  );
}
