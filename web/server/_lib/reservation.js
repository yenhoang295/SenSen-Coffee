export const RESERVATION_MS = 2 * 60 * 60 * 1000;
export const ACTIVE_RESERVATION = ['PENDING', 'CONFIRMED'];

const NEXT = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canReservationTransition(from, to) {
  return (NEXT[from] ?? []).includes(to);
}

// Hai lượt đặt trùng nếu cách nhau dưới 2 giờ.
export function overlaps(aMs, bMs) {
  return Math.abs(aMs - bMs) < RESERVATION_MS;
}

// Chọn bàn đủ chỗ, chưa bị giữ; bàn vừa chỗ nhất đứng trước.
export function findFreeTables(tables, reservations, timeMs, partySize) {
  const busy = new Set(
    reservations
      .filter(
        reservation =>
          ACTIVE_RESERVATION.includes(reservation.status) &&
          overlaps(
            new Date(reservation.reserve_time).getTime(),
            timeMs
          )
      )
      .map(reservation => reservation.table_id)
  );

  return tables
    .filter(table => table.seats >= partySize && !busy.has(table.table_id))
    .sort((a, b) => a.seats - b.seats || a.table_no - b.table_no);
}

// Nhận đặt trước từ 30 phút đến 30 ngày; số điện thoại 10 số bắt đầu bằng 0.
export function validateReservationInput(body, now = new Date()) {
  const errors = [];

  if (
    typeof body?.customerName !== 'string' ||
    !body.customerName.trim()
  ) {
    errors.push('customerName');
  }

  if (!/^0\d{9}$/.test(body?.phone ?? '')) {
    errors.push('phone');
  }

  if (
    !Number.isInteger(body?.partySize) ||
    body.partySize < 1 ||
    body.partySize > 12
  ) {
    errors.push('partySize');
  }

  if (!Number.isInteger(body?.tableId) || body.tableId < 1) {
    errors.push('tableId');
  }

  const time = new Date(body?.reserveTime).getTime();
  const min = now.getTime() + 30 * 60 * 1000;
  const max = now.getTime() + 30 * 24 * 60 * 60 * 1000;

  if (Number.isNaN(time) || time < min || time > max) {
    errors.push('reserveTime');
  }

  return errors;
}

export function publicReservation(reservation) {
  return {
    reservationId: reservation.reservation_id,
    customerName: reservation.customer_name,
    phone: reservation.phone,
    tableId: reservation.table_id,
    tableNo: reservation.dining_tables?.table_no ?? null,
    seats: reservation.dining_tables?.seats ?? null,
    reserveTime: reservation.reserve_time,
    partySize: reservation.party_size,
    status: reservation.status,
  };
}