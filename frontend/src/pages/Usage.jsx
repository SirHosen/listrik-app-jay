import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Zap, TrendingUp, Calendar } from 'lucide-react';
import Table from '../components/Table';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';

export default function Usage() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ month: '' });

  useEffect(() => {
    fetchReadings();
  }, [filter]);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.month) params.append('reading_month', filter.month);
      const res = await api.get(`/meter-readings?${params.toString()}`);
      const readingData = res.data.data?.readings;
      setReadings(Array.isArray(readingData) ? readingData : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data pemakaian');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Tanggal Pencatatan',
      field: 'reading_date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-400" size={18} />
          <span className="font-medium">{new Date(row.reading_date).toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      )
    },
    {
      header: 'Meter Awal',
      field: 'previous_meter',
      render: (row) => <span className="font-mono text-gray-700">{row.previous_meter} kWh</span>
    },
    {
      header: 'Meter Akhir',
      field: 'current_meter',
      render: (row) => <span className="font-mono font-semibold text-gray-900">{row.current_meter} kWh</span>
    },
    {
      header: 'Total Pemakaian',
      field: 'usage',
      render: (row) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary-500" size={18} />
          <span className="font-bold text-lg text-primary-600">
            {row.usage_kwh} kWh
          </span>
        </div>
      )
    }
  ];

  const totalUsage = readings.reduce((sum, r) => sum + (r.usage_kwh || 0), 0);
  const avgUsage = readings.length > 0 ? (totalUsage / readings.length).toFixed(2) : 0;

  return (
    <Layout>
      <PageHeader
        title="Riwayat Pemakaian Listrik"
        subtitle="Monitor pemakaian listrik Anda"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 p-4 rounded-xl">
              <Zap className="text-primary-600" size={32} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Pemakaian</div>
              <div className="text-3xl font-bold text-gray-900">{totalUsage} kWh</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-xl">
              <TrendingUp className="text-green-600" size={32} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Rata-rata/Bulan</div>
              <div className="text-3xl font-bold text-gray-900">{avgUsage} kWh</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-xl">
              <Calendar className="text-blue-600" size={32} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Pencatatan</div>
              <div className="text-3xl font-bold text-gray-900">{readings.length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-gray-700">Filter Periode:</label>
          <input
            type="month"
            value={filter.month}
            onChange={(e) => setFilter({ month: e.target.value })}
            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
          {filter.month && (
            <button
              onClick={() => setFilter({ month: '' })}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        data={readings}
        loading={loading}
      />
    </Layout>
  );
}
