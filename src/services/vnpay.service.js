import crypto from 'crypto';
import qs from 'qs';
import dotenv from 'dotenv';

dotenv.config();

// VNPay Configuration - Dùng VNP_ prefix như code đang chạy
const VNPAY_TMN_CODE = process.env.VNP_TMN_CODE || process.env.VNPAY_TMN_CODE || '';
const VNPAY_HASH_SECRET = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || '';
const VNPAY_URL = process.env.VNP_URL || process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNPAY_RETURN_URL = process.env.VNP_RETURN_URL || process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay-return';

/**
 * Sort object by key and encode values (VNPay format)
 * CHÍNH XÁC như code đang chạy được - copy y hệt
 */
function sortObject(obj) {
  const sorted = {};
  const str = Object.keys(obj).map(key => encodeURIComponent(key));
  str.sort();
  for (let key = 0; key < str.length; key++) {
    // Code đang chạy dùng obj[str[key]] trực tiếp
    // Vì các key VNPay không có ký tự đặc biệt nên encode không đổi
    // str[key] is encoded key, but since VNPay keys don't have special chars, it equals original key
    const encodedKey = str[key];
    const originalKey = decodeURIComponent(encodedKey);
    sorted[encodedKey] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
  }
  return sorted;
}

/**
 * Create VNPay payment URL
 */
export const createVNPayPaymentUrl = (paymentData) => {
  const {
    amount,
    orderId,
    orderDescription,
    orderType = 'other',
    locale = 'vn',
    ipAddr = '127.0.0.1',
  } = paymentData;

  // Format date: YYYYMMDDHHmmss
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;

  // VNPay params - KHÔNG có vnp_ExpireDate và vnp_SecureHashType
  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderDescription,
    vnp_OrderType: orderType,
    vnp_Amount: amount * 100, // VNPay expects amount in cents (multiply by 100)
    vnp_ReturnUrl: VNPAY_RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  // Sort params using VNPay format
  vnp_Params = sortObject(vnp_Params);

  // Create query string for signing (without encoding) - dùng qs như code đang chạy
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  // Use Buffer.from() like the working code
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Add secure hash to params (KHÔNG có vnp_SecureHashType)
  vnp_Params['vnp_SecureHash'] = signed;

  // Build payment URL - dùng qs như code đang chạy
  const paymentUrl = VNPAY_URL + '?' + qs.stringify(vnp_Params, { encode: false });

  return paymentUrl;
};

/**
 * Verify VNPay callback data
 */
export const verifyVNPayCallback = (queryParams) => {
  const vnp_SecureHash = queryParams['vnp_SecureHash'];
  const paramsCopy = { ...queryParams };
  delete paramsCopy['vnp_SecureHash'];
  delete paramsCopy['vnp_SecureHashType'];

  // Sort params using VNPay format
  let sortedParams = sortObject(paramsCopy);

  // Create sign data - dùng qs như code đang chạy
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  // Use Buffer.from() like the working code
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Verify signature
  if (signed !== vnp_SecureHash) {
    return { isValid: false, data: null };
  }

  // Extract data (use original queryParams, not sorted)
  const data = {
    vnp_TxnRef: paramsCopy['vnp_TxnRef'] || '',
    vnp_Amount: parseInt(paramsCopy['vnp_Amount'] || '0', 10) / 100, // Convert back from cents
    vnp_ResponseCode: paramsCopy['vnp_ResponseCode'] || '',
    vnp_TransactionNo: paramsCopy['vnp_TransactionNo'],
    vnp_BankCode: paramsCopy['vnp_BankCode'],
    vnp_PayDate: paramsCopy['vnp_PayDate'],
    vnp_OrderInfo: paramsCopy['vnp_OrderInfo'],
  };

  return { isValid: true, data };
};

/**
 * Get VNPay response message
 */
export const getVNPayResponseMessage = (responseCode) => {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
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
