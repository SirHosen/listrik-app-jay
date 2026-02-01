import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FileText, CreditCard, AlertCircle } from 'lucide-react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { FormSelect } from '../components/FormInput';
import { formatCurrency } from '../utils/helpers';

export default function MyBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bills');
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

  const handlePay = (bill) => {
    setSelectedBill(bill);
    setIsPayModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      await api.post('/payments', {
        bill_id: selectedBill.id,
        amount: selectedBill.total_amount,
        payment_method: paymentMethod
      });
      toast.success('Pembayaran berhasil disubmit. Menunggu verifikasi admin.');
      fetchBills();
      setIsPayModalOpen(false);
      setSelectedBill(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal submit pembayaran');
    } finally {
      setPaying(false);
    }
  };

  const columns = [
    {
      header: 'Nomor Tagihan',
      field: 'bill_number',
      render: (row) => <span className="font-mono text-sm font-semibold text-primary-600">{row.bill_number}</span>
    },
    {
      header: 'Periode',
      field: 'billing_period',
      render: (row) => <span className="font-medium">{row.bill_month}</span>
    },
    {
      header: 'Pemakaian',
      field: 'usage_kwh',
      render: (row) => <span className="font-semibold">{row.usage_kwh} kWh</span>
    },
    {
      header: 'Total Tagihan',
      field: 'total_amount',
      render: (row) => <span className="font-bold text-lg text-gray-900">{formatCurrency(row.total_amount)}</span>
    },
    {
      header: 'Jatuh Tempo',
      field: 'due_date',
      render: (row) => {
        const dueDate = new Date(row.due_date);
        const isOverdue = dueDate < new Date() && row.status !== 'paid';
        return (
          <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
            {dueDate.toLocaleDateString('id-ID')}
            {isOverdue && <AlertCircle className="inline ml-1" size={16} />}
          </span>
        );
      }
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => {
        const variants = {
          paid: 'success',
          overdue: 'danger',
          unpaid: 'warning'
        };
        const labels = {
          paid: 'Lunas',
          overdue: 'Terlambat',
          unpaid: 'Belum Bayar'
        };
        return <Badge variant={variants[row.status]}>{labels[row.status]}</Badge>;
      }
    }
  ];

  const unpaidBills = bills.filter(b => b.status === 'unpaid');
  const overdueBills = bills.filter(b => b.status === 'overdue');
  const paidBills = bills.filter(b => b.status === 'paid');
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);

  return (
    <Layout>
      <PageHeader
        title="Tagihan Saya"
        subtitle="Kelola dan bayar tagihan listrik Anda"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <FileText className="text-red-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Belum Bayar</div>
              <div className="text-2xl font-bold text-red-600">{unpaidBills.length}</div>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="text-yellow-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Terlambat</div>
              <div className="text-2xl font-bold text-yellow-600">{overdueBills.length}</div>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CreditCard className="text-green-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Lunas</div>
              <div className="text-2xl font-bold text-green-600">{paidBills.length}</div>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-primary-500">
          <div>
            <div className="text-sm text-gray-600">Total Tagihan</div>
            <div className="text-xl font-bold text-primary-600 mt-1">{formatCurrency(totalUnpaid)}</div>
          </div>
        </Card>
      </div>

      <Table
        columns={columns}
        data={bills}
        loading={loading}
        actions={(row) => (
          row.status === 'unpaid' || row.status === 'overdue' ? (
            <Button
              size="sm"
              variant={row.status === 'overdue' ? 'danger' : 'primary'}
              icon={CreditCard}
              onClick={() => handlePay(row)}
            >
              {row.status === 'overdue' ? 'Bayar Sekarang' : 'Bayar'}
            </Button>
          ) : (
            <Badge variant="success">Lunas</Badge>
          )
        )}
      />

      {/* Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Konfirmasi Pembayaran"
        size="md"
      >
        {selectedBill && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Nomor Tagihan:</span>
                <span className="font-mono font-semibold">{selectedBill.bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Periode:</span>
                <span className="font-medium">{selectedBill.bill_month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pemakaian:</span>
                <span className="font-medium">{selectedBill.usage_kwh} kWh</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-gray-900 font-semibold">Total Bayar:</span>
                <span className="text-2xl font-bold text-primary-600">{formatCurrency(selectedBill.total_amount)}</span>
              </div>
            </div>

            <FormSelect
              label="Metode Pembayaran"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            >
              <option value="transfer">Transfer Bank</option>
              <option value="cash">Tunai</option>
            </FormSelect>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> Setelah submit, pembayaran Anda akan diverifikasi oleh admin. 
                Status tagihan akan berubah menjadi "Lunas" setelah verifikasi berhasil.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={paying}>
                Konfirmasi Pembayaran
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
