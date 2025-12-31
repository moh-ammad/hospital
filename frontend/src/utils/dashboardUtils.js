// Format date as a short date (e.g. "Dec 31, 2025")
export const formatDate = (dateInput) => {
  if (!dateInput && dateInput !== 0) return 'N/A';

  let date;
  try {
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      let str = String(dateInput).trim();

      const atIndex = str.toLowerCase().indexOf(' at ');
      if (atIndex > 0) {
        str = str.substring(0, atIndex).trim();
      }

      const msMatch = str.match(/\/?Date\((\d+)\)\/?/i);
      if (msMatch) {
        date = new Date(Number(msMatch[1]));
      } else if (/^\d+$/.test(str)) {
        date = new Date(Number(str));
      } else {
        date = new Date(str);
      }
    }

    if (!date || isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    console.error(e);
    return 'N/A';
  }
};

// ✅ PURE JS status helper
export const getStatusBadgeData = (status) => {
  const statusLower = (status || '').toLowerCase();

  if (statusLower.includes('confirm')) {
    return {
      text: 'Confirmed',
      className: 'bg-green-100 text-green-700',
    };
  }

  if (statusLower.includes('cancel')) {
    return {
      text: 'Cancelled',
      className: 'bg-red-100 text-red-700',
    };
  }

  if (statusLower.includes('miss')) {
    return {
      text: 'Missed',
      className: 'bg-orange-100 text-orange-700',
    };
  }

  return {
    text: status || 'Unknown',
    className: 'bg-gray-100 text-gray-700',
  };
};
