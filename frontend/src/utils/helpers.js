// Format currency to Rupiah
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Format date to Indonesian format
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Format datetime to Indonesian format
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format month (YYYY-MM) to readable format
export const formatMonth = (month) => {
  if (!month) return '-';
  const [year, monthNum] = month.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
};

// Get current month in YYYY-MM format
export const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Get badge color for status
export const getStatusBadge = (status) => {
  const badges = {
    active: 'badge-success',
    inactive: 'badge-danger',
    paid: 'badge-success',
    unpaid: 'badge-warning',
    overdue: 'badge-danger',
    pending: 'badge-warning',
    verified: 'badge-success',
    rejected: 'badge-danger'
  };
  return badges[status] || 'badge-info';
};

// Get status text in Indonesian
export const getStatusText = (status) => {
  const texts = {
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    paid: 'Sudah Bayar',
    unpaid: 'Belum Bayar',
    overdue: 'Jatuh Tempo',
    pending: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak'
  };
  return texts[status] || status;
};
