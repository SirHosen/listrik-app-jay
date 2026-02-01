import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput, { FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { formatCurrency } from '../utils/helpers';

const initialForm = {
  power_capacity: '900',
  rate_per_kwh: '',
  admin_fee: '',
  tax_percentage: '',
  effective_date: ''
};

export default function Tariffs() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tariffs');
      setTariffs(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data tarif');
      setTariffs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/tariffs/${editingId}`, {
          rate_per_kwh: form.rate_per_kwh,
          admin_fee: form.admin_fee || 0,
          tax_percentage: form.tax_percentage || 0,
          is_active: true
        });
        toast.success('Tarif berhasil diupdate');
      } else {
        await api.post('/tariffs', {
          power_capacity: form.power_capacity,
          rate_per_kwh: form.rate_per_kwh,
          admin_fee: form.admin_fee || 0,
          tax_percentage: form.tax_percentage || 0,
          effective_date: form.effective_date
        });
        toast.success('Tarif berhasil ditambahkan');
      }
      fetchTariffs();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operasi gagal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tariff) => {
    setEditingId(tariff.id);
    setForm({
      power_capacity: tariff.power_capacity,
      rate_per_kwh: tariff.rate_per_kwh,
      admin_fee: tariff.admin_fee,
      tax_percentage: tariff.tax_percentage,
      effective_date: tariff.effective_date?.slice(0, 10) || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus tarif ini?')) return;
    try {
      await api.delete(`/tariffs/${id}`);
      toast.success('Tarif berhasil dihapus');
      fetchTariffs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus tarif');
    }
  };

  const openModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const columns = [
    {
      header: 'Daya Listrik',
      field: 'power_capacity',
      render: (row) => <span className="font-bold text-primary-600">{row.power_capacity} VA</span>
    },
    {
      header: 'Tarif per kWh',
      field: 'rate_per_kwh',
      render: (row) => <span className="font-semibold">{formatCurrency(row.rate_per_kwh)}</span>
    },
    {
      header: 'Biaya Admin',
      field: 'admin_fee',
      render: (row) => <span>{formatCurrency(row.admin_fee)}</span>
    },
    {
      header: 'Pajak',
      field: 'tax_percentage',
      render: (row) => <span>{row.tax_percentage}%</span>
    },
    {
      header: 'Berlaku Sejak',
      field: 'effective_date',
      render: (row) => <span className="text-sm">{new Date(row.effective_date).toLocaleDateString('id-ID')}</span>
    },
    {
      header: 'Status',
      field: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Aktif' : 'Non-aktif'}
        </Badge>
      )
    }
  ];

  return (
    <Layout>
      <PageHeader
        title="Kelola Tarif Listrik"
        subtitle="Manajemen tarif berdasarkan daya terpasang"
        action={
          <Button icon={Plus} onClick={openModal}>
            Tambah Tarif
          </Button>
        }
      />

      <Table
        columns={columns}
        data={tariffs}
        loading={loading}
        actions={(row) => (
          <>
            <Button
              size="sm"
              variant="ghost"
              icon={Edit}
              onClick={() => handleEdit(row)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              onClick={() => handleDelete(row.id)}
            >
              Hapus
            </Button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Tarif' : 'Tambah Tarif Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Daya Listrik"
              name="power_capacity"
              value={form.power_capacity}
              onChange={handleChange}
              required
              disabled={!!editingId}
            >
              <option value="450">450 VA</option>
              <option value="900">900 VA</option>
              <option value="1300">1300 VA</option>
              <option value="2200">2200 VA</option>
            </FormSelect>

            <FormInput
              label="Tarif per kWh"
              type="number"
              name="rate_per_kwh"
              value={form.rate_per_kwh}
              onChange={handleChange}
              required
              placeholder="Contoh: 1444"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Biaya Admin"
              type="number"
              name="admin_fee"
              value={form.admin_fee}
              onChange={handleChange}
              placeholder="Contoh: 2500"
            />

            <FormInput
              label="Persentase Pajak (%)"
              type="number"
              step="0.01"
              name="tax_percentage"
              value={form.tax_percentage}
              onChange={handleChange}
              placeholder="Contoh: 10"
            />
          </div>

          {!editingId && (
            <FormInput
              label="Tanggal Berlaku"
              type="date"
              name="effective_date"
              value={form.effective_date}
              onChange={handleChange}
              required
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
