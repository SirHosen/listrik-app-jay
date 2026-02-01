import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput, { FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

const initialForm = {
  email: '',
  password: '',
  full_name: '',
  address: '',
  phone: '',
  power_capacity: '900',
  status: 'active'
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [filters]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const res = await api.get(`/customers?${params.toString()}`);
      const customerData = res.data.data?.customers;
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data pelanggan');
      setCustomers([]);
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
        const updateData = { ...form };
        if (!updateData.password) delete updateData.password;
        await api.put(`/customers/${editingId}`, updateData);
        toast.success('Pelanggan berhasil diupdate');
      } else {
        await api.post('/customers', form);
        toast.success('Pelanggan berhasil ditambahkan');
      }
      fetchCustomers();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operasi gagal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      email: customer.email,
      password: '',
      full_name: customer.full_name,
      address: customer.address,
      phone: customer.phone,
      power_capacity: customer.power_capacity?.toString() || '900',
      status: customer.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus pelanggan ini?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Pelanggan berhasil dihapus');
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus pelanggan');
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
      header: 'ID Pelanggan',
      field: 'customer_number',
      render: (row) => <span className="font-mono text-sm">{row.customer_number}</span>
    },
    {
      header: 'Nama Lengkap',
      field: 'full_name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name}</div>
          <div className="text-xs text-gray-500">{row.email}</div>
        </div>
      )
    },
    {
      header: 'Alamat',
      field: 'address',
      render: (row) => <span className="text-sm">{row.address}</span>
    },
    {
      header: 'Telepon',
      field: 'phone',
      render: (row) => <span className="text-sm font-mono">{row.phone}</span>
    },
    {
      header: 'Daya',
      field: 'power_capacity',
      render: (row) => <span className="font-semibold">{row.power_capacity} VA</span>
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status === 'active' ? 'Aktif' : 'Non-aktif'}
        </Badge>
      )
    }
  ];

  return (
    <Layout>
      <PageHeader
        title="Kelola Pelanggan"
        subtitle="Manajemen data pelanggan listrik"
        action={
          <Button icon={Plus} onClick={openModal}>
            Tambah Pelanggan
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama, email, atau ID pelanggan..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <Button
            variant="secondary"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filter
          </Button>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex gap-4">
            <div className="w-48">
              <FormSelect
                label="Status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Non-aktif</option>
              </FormSelect>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => setFilters({ status: '', search: '' })}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={customers}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Nama Lengkap"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
              placeholder="Masukkan nama lengkap"
            />
            <FormInput
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="email@contoh.com"
            />
          </div>

          <FormInput
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required={!editingId}
            placeholder={editingId ? "Kosongkan jika tidak ingin mengubah" : "Masukkan password"}
          />

          <FormInput
            label="Alamat"
            name="address"
            value={form.address}
            onChange={handleChange}
            required
            placeholder="Alamat lengkap"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Telepon"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              placeholder="08xxxxxxxxxx"
            />
            <FormSelect
              label="Daya Listrik"
              name="power_capacity"
              value={form.power_capacity}
              onChange={handleChange}
              required
            >
              <option value="450">450 VA</option>
              <option value="900">900 VA</option>
              <option value="1300">1300 VA</option>
              <option value="2200">2200 VA</option>
            </FormSelect>
          </div>

          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            required
          >
            <option value="active">Aktif</option>
            <option value="inactive">Non-aktif</option>
          </FormSelect>

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
