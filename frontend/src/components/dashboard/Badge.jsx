const Badge = ({ value, defaultClass = 'bg-blue-100 text-blue-700' }) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value.text) {
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${value.className}`}>
        {value.text}
      </span>
    );
  }

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${defaultClass}`}>
      {value}
    </span>
  );
};

export default Badge;
