export function formatRwf(amount: number): string {
  return 'Rwf ' + amount.toLocaleString('en-RW');
}

export function formatPhone(phone: string): string {
  return phone.replace('+250', '0');
}

export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
}
