const crypto = require('crypto');
const qs = require('qs');
require('dotenv').config();

const VNPAY_TMN_CODE = process.env.VNP_TMN_CODE || process.env.VNPAY_TMN_CODE || '';
const VNPAY_HASH_SECRET = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || '';
const VNPAY_URL = process.env.VNP_URL || process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNPAY_RETURN_URL = process.env.VNP_RETURN_URL || process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay-return';

// VNPAY: "Tiếng Việt không dấu và không bao gồm các ký tự đặc biệt"
function toUnsignedVietnamese(str) {
  if (!str || typeof str !== 'string') return '';
  const map = {
    à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a', ă: 'a', ằ: 'a', ắ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a', â: 'a', ầ: 'a', ấ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
    è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e', ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o', ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o', ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y', đ: 'd',
    À: 'A', Á: 'A', Ả: 'A', Ã: 'A', Ạ: 'A', Ă: 'A', Ằ: 'A', Ắ: 'A', Ẳ: 'A', Ẵ: 'A', Ặ: 'A', Â: 'A', Ầ: 'A', Ấ: 'A', Ẩ: 'A', Ẫ: 'A', Ậ: 'A',
    È: 'E', É: 'E', Ẻ: 'E', Ẽ: 'E', Ẹ: 'E', Ê: 'E', Ề: 'E', Ế: 'E', Ể: 'E', Ễ: 'E', Ệ: 'E',
    Ì: 'I', Í: 'I', Ỉ: 'I', Ĩ: 'I', Ị: 'I',
    Ò: 'O', Ó: 'O', Ỏ: 'O', Õ: 'O', Ọ: 'O', Ô: 'O', Ồ: 'O', Ố: 'O', Ổ: 'O', Ỗ: 'O', Ộ: 'O', Ơ: 'O', Ờ: 'O', Ớ: 'O', Ở: 'O', Ỡ: 'O', Ợ: 'O',
    Ù: 'U', Ú: 'U', Ủ: 'U', Ũ: 'U', Ụ: 'U', Ư: 'U', Ừ: 'U', Ứ: 'U', Ử: 'U', Ữ: 'U', Ự: 'U',
    Ỳ: 'Y', Ý: 'Y', Ỷ: 'Y', Ỹ: 'Y', Ỵ: 'Y', Đ: 'D',
  };
  let result = str;
  for (const [k, v] of Object.entries(map)) result = result.replace(new RegExp(k, 'g'), v);
  return result.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 255);
}

// sortObject - khớp credentials/vnpay (đã chạy thành công)
function sortObject(obj) {
  const sorted = {};
  const str = Object.keys(obj).map(key => encodeURIComponent(key));
  str.sort();
  for (let key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(String(obj[str[key]] ?? '')).replace(/%20/g, '+');
  }
  return sorted;
}

const createVNPayPaymentUrl = (paymentData) => {
  const {
    amount,
    orderId,
    orderDescription,
    orderType = 'other',
    locale = 'vn',
    ipAddr = '127.0.0.1',
  } = paymentData;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;

  const expireDate = new Date(now.getTime() + 15 * 60 * 1000);
  const vnp_ExpireDate = `${expireDate.getFullYear()}${pad(expireDate.getMonth() + 1)}${pad(expireDate.getDate())}${pad(expireDate.getHours())}${pad(expireDate.getMinutes())}${pad(expireDate.getSeconds())}`;

  const orderInfoClean = toUnsignedVietnamese(orderDescription) || `Thanh toan don hang ${orderId}`;

  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: orderInfoClean,
    vnp_OrderType: orderType,
    vnp_Amount: Math.round(amount * 100),
    vnp_ReturnUrl: VNPAY_RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate,
  };

  vnp_Params = sortObject(vnp_Params);
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params['vnp_SecureHash'] = signed;

  const paymentUrl = VNPAY_URL + '?' + qs.stringify(vnp_Params, { encode: false });
  return paymentUrl;
};

const verifyVNPayCallback = (queryParams) => {
  const vnp_SecureHash = queryParams['vnp_SecureHash'];
  const paramsCopy = { ...queryParams };
  delete paramsCopy['vnp_SecureHash'];
  delete paramsCopy['vnp_SecureHashType'];

  let sortedParams = sortObject(paramsCopy);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  if (signed !== vnp_SecureHash) {
    return { isValid: false, data: null };
  }

  const data = {
    vnp_TxnRef: paramsCopy['vnp_TxnRef'] || '',
    vnp_Amount: parseInt(paramsCopy['vnp_Amount'] || '0', 10) / 100,
    vnp_ResponseCode: paramsCopy['vnp_ResponseCode'] || '',
    vnp_TransactionNo: paramsCopy['vnp_TransactionNo'],
    vnp_BankCode: paramsCopy['vnp_BankCode'],
    vnp_PayDate: paramsCopy['vnp_PayDate'],
    vnp_OrderInfo: paramsCopy['vnp_OrderInfo'],
  };

  return { isValid: true, data };
};

const getVNPayResponseMessage = (responseCode) => {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ.',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán.',
    '12': 'Thẻ/Tài khoản bị khóa.',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
    '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Lỗi không xác định.',
  };

  return messages[responseCode] || `Mã lỗi: ${responseCode}`;
};

module.exports = {
  createVNPayPaymentUrl,
  verifyVNPayCallback,
  getVNPayResponseMessage,
};
