import { getAccessToken } from './session.js';

const $ = id => document.getElementById(id);

const form = $('reservation-form');
const nameInput = $('customer-name');
const phoneInput = $('phone');
const sizeInput = $('party-size');
const timeInput = $('reserve-time');
const tableSelect = $('table');
const findButton = $('find-tables');
const submitButton = $('submit');
const message = $('message');

function toLocalInputValue(date) {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function setTimeLimits() {
  const now = new Date();
  const min = new Date(now.getTime() + 30 * 60 * 1000);
  const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  timeInput.min = toLocalInputValue(min);
  timeInput.max = toLocalInputValue(max);
  timeInput.step = '900';

  const suggested = new Date(now.getTime() + 60 * 60 * 1000);
  suggested.setSeconds(0, 0);
  suggested.setMinutes(Math.ceil(suggested.getMinutes() / 15) * 15);

  timeInput.value = toLocalInputValue(suggested);
}

function clearAvailableTables() {
  tableSelect.replaceChildren(
    new Option('Hãy tìm bàn trống trước', '')
  );
  tableSelect.disabled = true;
  submitButton.disabled = true;
}

function selectedTimeAsISO() {
  return new Date(timeInput.value).toISOString();
}

async function findTables() {
  message.textContent = '';
  clearAvailableTables();

  if (!sizeInput.value || !timeInput.value) {
    message.textContent = 'Hãy chọn số người và ngày giờ đến.';
    return;
  }

  findButton.disabled = true;
  findButton.textContent = 'Đang tìm bàn...';

  try {
    const params = new URLSearchParams({
      time: selectedTimeAsISO(),
      size: sizeInput.value,
    });

    const response = await fetch(
      `/api/reservations/availability?${params.toString()}`
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Không tìm được bàn trống.');
    }

    const tables = data.tables ?? [];

    if (tables.length === 0) {
      message.textContent = 'Không có bàn trống phù hợp giờ và số người đã chọn.';
      return;
    }

    tableSelect.replaceChildren(
      new Option('Chọn bàn', ''),
      ...tables.map(table =>
        new Option(
          `Bàn ${table.tableNo} · ${table.seats} chỗ`,
          String(table.tableId)
        )
      )
    );

    tableSelect.disabled = false;
    message.textContent = `Tìm thấy ${tables.length} bàn trống.`;
  } catch (error) {
    message.textContent = error.message || 'Lỗi kết nối, hãy thử lại.';
  } finally {
    findButton.disabled = false;
    findButton.textContent = 'Tìm bàn trống';
  }
}

async function submitReservation(event) {
  event.preventDefault();
  message.textContent = '';

  if (!tableSelect.value) {
    message.textContent = 'Hãy tìm và chọn một bàn trước.';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Đang gửi...';

  try {
    const headers = { 'content-type': 'application/json' };
    const token = await getAccessToken();

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const body = {
      customerName: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      partySize: Number(sizeInput.value),
      tableId: Number(tableSelect.value),
      reserveTime: selectedTimeAsISO(),
    };

    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Không đặt được bàn.');
    }

    const time = new Date(data.reserveTime).toLocaleString('vi-VN');

    message.textContent =
      `Đặt bàn thành công. Mã đặt bàn: ${data.reservationId}. ` +
      `Bàn ${data.tableNo}, lúc ${time}. Chờ nhân viên xác nhận.`;

    form.reset();
    setTimeLimits();
    clearAvailableTables();
  } catch (error) {
    message.textContent = error.message || 'Lỗi kết nối, hãy thử lại.';
    submitButton.disabled = false;
  } finally {
    submitButton.textContent = 'Gửi yêu cầu đặt bàn';
  }
}

findButton.addEventListener('click', findTables);
form.addEventListener('submit', submitReservation);
tableSelect.addEventListener('change', () => {
  submitButton.disabled = !tableSelect.value;
});

sizeInput.addEventListener('change', clearAvailableTables);
timeInput.addEventListener('change', clearAvailableTables);

setTimeLimits();
clearAvailableTables();