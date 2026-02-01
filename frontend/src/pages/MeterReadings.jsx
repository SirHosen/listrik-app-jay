import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Search, Zap, Info } from 'lucide-react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput, { FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';

const initialForm = {
  customer_id: '',
  reading_date: '',
  current_meter: '',
  notes: '',
  generateBill: true // Default: langsung generate tagihan
};

export default function MeterReadings() {
  const [readings, setReadings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ search: '', month: '' });
  
  // State untuk info meter terakhir
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);

  useEffect(() => {
    fetchReadings();
    fetchCustomers();
  }, [filters]);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.month) params.append('reading_month', filters.month);
      const res = await api.get(`/meter-readings?${params.toString()}`);
      const readingData = res.data.data?.readings;
      setReadings(Array.isArray(readingData) ? readingData : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data meter');
      setReadings([]);
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

  // Fetch last meter reading saat customer dipilih
  const fetchCustomerInfo = async (customerId) => {
    if (!customerId) {
      setCustomerInfo(null);
      return;
    }
    
    setLoadingCustomerInfo(true);
    try {
      const res = await api.get(`/meter-readings/last/${customerId}`);
      setCustomerInfo(res.data.data);
    } catch (error) {
      console.error(error);
      setCustomerInfo(null);
    } finally {
      setLoadingCustomerInfo(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setForm({ ...form, [name]: newValue });
    
    // Fetch customer info saat customer dipilih
    if (name === 'customer_id' && value) {
      fetchCustomerInfo(value);
    }
  };

  // Hitung estimasi usage dan biaya
  const calculateEstimate = () => {
    if (!customerInfo || !form.current_meter) return null;
    
    const currentMeter = parseFloat(form.current_meter) || 0;
    const previousMeter = customerInfo.lastMeter || 0;
    const usageKwh = currentMeter - previousMeter;
    const pricePerKwh = customerInfo.pricePerKwh || 0;
    const estimatedCost = usageKwh * pricePerKwh;
    
    return {
      previousMeter,
      currentMeter,
      usageKwh,
      pricePerKwh,
      estimatedCost,
      isValid: usageKwh >= 0
    };
  };

  const estimate = calculateEstimate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi client-side
    if (!form.customer_id || !form.reading_date || !form.current_meter) {
      toast.error('Semua field wajib diisi!');
      return;
    }

    if (parseFloat(form.current_meter) < 0) {
      toast.error('Meter saat ini tidak boleh negatif!');
      return;
    }

    setSubmitting(true);
    try {
      // Extract year-month from reading_date for reading_month
      const readingMonth = form.reading_date.slice(0, 7); // YYYY-MM
      
      const payload = {
        customer_id: parseInt(form.customer_id),
        reading_month: readingMonth,
        current_meter: parseFloat(form.current_meter),
        reading_date: form.reading_date,
        notes: form.notes || null
      };

      if (editingId) {
        await api.put(`/meter-readings/${editingId}`, payload);
        toast.success('Pembacaan meter berhasil diupdate');
      } else {
        const meterRes = await api.post('/meter-readings', payload);
        toast.success('Pembacaan meter berhasil ditambahkan');
        
        // Generate bill otomatis jika checkbox dicentang
        if (form.generateBill && meterRes.data.data?.id) {
          try {
            await api.post('/bills/generate', {
              customer_id: parseInt(form.customer_id),
              bill_month: readingMonth
            });
            toast.success('Tagihan berhasil di-generate!');
          } catch (billError) {
            console.error('Generate bill error:', billError.response?.data);
            toast.error(billError.response?.data?.message || 'Tagihan gagal di-generate, silakan generate manual');
          }
        }
      }
      fetchReadings();
      closeModal();
    } catch (error) {
      console.error('Submit error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Operasi gagal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (reading) => {
    setEditingId(reading.id);
    setForm({
      customer_id: reading.customer_id,
      reading_date: reading.reading_date?.slice(0, 10) || '',
      current_meter: reading.current_meter,
      notes: reading.notes || '',
      generateBill: false // Tidak generate bill saat edit
    });
    setCustomerInfo(null); // Reset customer info saat edit
    setIsModalOpen(true);
  };

  const openModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setCustomerInfo(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const columns = [
    {
      header: 'Tanggal',
      field: 'reading_date',
      render: (row) => <span className="font-medium">{new Date(row.reading_date).toLocaleDateString('id-ID')}</span>
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
      header: 'Meter Lalu',
      field: 'previous_meter',
      render: (row) => <span className="font-mono">{row.previous_meter} kWh</span>
    },
    {
      header: 'Meter Sekarang',
      field: 'current_meter',
      render: (row) => <span className="font-mono font-semibold">{row.current_meter} kWh</span>
    },
    {
      header: 'Pemakaian',
      field: 'usage',
      render: (row) => <span className="font-bold text-primary-600">{row.usage_kwh} kWh</span>
    }
  ];

  return (
    <Layout>
      <PageHeader
        title="Pembacaan Meter"
        subtitle="Manajemen data pembacaan meter listrik"
        action={
          <Button icon={Plus} onClick={openModal}>
            Catat Pembacaan
          </Button>
        }
      />

      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari pelanggan..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
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
        data={readings}
        loading={loading}
        actions={(row) => (
          <Button
            size="sm"
            variant="ghost"
            icon={Edit}
            onClick={() => handleEdit(row)}
          >
            Edit
          </Button>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Pembacaan Meter' : 'Catat Pembacaan Meter'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Pelanggan"
            name="customer_id"
            value={form.customer_id}
            onChange={handleChange}
            required
            disabled={!!editingId}
          >
            <option value="">Pilih Pelanggan</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name} - {c.customer_number}
              </option>
            ))}
          </FormSelect>

          {/* Info Customer & Meter Terakhir */}
          {form.customer_id && !editingId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              {loadingCustomerInfo ? (
                <div className="text-blue-600 text-sm">Memuat data meter terakhir...</div>
              ) : customerInfo ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-blue-800 font-medium">
                    <Info size={16} />
                    Informasi Pelanggan
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-blue-700">
                    <span>Daya: {customerInfo.customer?.power_capacity} VA</span>
                    <span>Tarif: Rp {customerInfo.pricePerKwh?.toLocaleString('id-ID')}/kWh</span>
                  </div>
                  <div className="text-blue-700">
                    <span className="font-medium">Meter Terakhir:</span>{' '}
                    {customerInfo.lastMeter} kWh
                    {customerInfo.lastMonth && ` (${customerInfo.lastMonth})`}
                  </div>
                </div>
              ) : (
                <div className="text-blue-600 text-sm">
                  <Info size={16} className="inline mr-1" />
                  Pelanggan baru, belum ada data meter sebelumnya
                </div>
              )}
            </div>
          )}

          <FormInput
            label="Tanggal Pembacaan"
            type="date"
            name="reading_date"
            value={form.reading_date}
            onChange={handleChange}
            required
          />

          {form.reading_date && (
            <div className="text-sm text-gray-600 -mt-2">
              <span className="font-medium">Bulan Tagihan:</span> {form.reading_date.slice(0, 7)}
            </div>
          )}

          <FormInput
            label="Meter Saat Ini (kWh)"
            type="number"
            name="current_meter"
            value={form.current_meter}
            onChange={handleChange}
            required
            placeholder={customerInfo ? `Minimal ${customerInfo.lastMeter}` : '0'}
            step="0.01"
            min={customerInfo?.lastMeter || 0}
          />

          {/* Estimasi Pemakaian & Biaya */}
          {estimate && !editingId && (
            <div className={`rounded-lg p-3 ${estimate.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className={`flex items-center gap-2 font-medium ${estimate.isValid ? 'text-green-800' : 'text-red-800'}`}>
                <Zap size={16} />
                Estimasi Tagihan
              </div>
              {estimate.isValid ? (
                <div className="space-y-1 text-sm text-green-700 mt-1">
                  <div>Pemakaian: <span className="font-bold">{estimate.usageKwh} kWh</span></div>
                  <div>Estimasi Biaya: <span className="font-bold text-lg">Rp {estimate.estimatedCost.toLocaleString('id-ID')}</span></div>
                </div>
              ) : (
                <div className="text-sm text-red-700 mt-1">
                  ⚠️ Meter saat ini ({estimate.currentMeter}) tidak boleh kurang dari meter sebelumnya ({estimate.previousMeter})
                </div>
              )}
            </div>
          )}

          <FormInput
            label="Catatan (Opsional)"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Tambahkan catatan jika diperlukan"
          />

          {/* Checkbox Generate Bill */}
          {!editingId && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="generateBill"
                name="generateBill"
                checked={form.generateBill}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="generateBill" className="text-sm text-gray-700">
                Langsung generate tagihan setelah simpan
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button 
              type="submit" 
              loading={submitting}
              disabled={estimate && !estimate.isValid}
            >
              {editingId ? 'Update' : (form.generateBill ? 'Simpan & Generate' : 'Simpan')}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
