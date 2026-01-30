/**
 * Test script to compare VNPay URL generation
 * Run: node test-vnpay.js
 */

require('dotenv').config();
const crypto = require('crypto');
const qs = require('qs');

// VNPay Configuration
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';
const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

// Hàm sắp xếp tham số đúng chuẩn VNPAY (từ code đang chạy)
function sortObject(obj) {
    let sorted = {};
    let str = Object.keys(obj).map(key => encodeURIComponent(key));
    str.sort();
    for (let key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// Test data
const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const seconds = String(date.getSeconds()).padStart(2, '0');
const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;
const orderId = `${day}${hours}${minutes}${seconds}`;
const amount = 500000;

let vnp_Params = {
    'vnp_Version': '2.1.0',
    'vnp_Command': 'pay',
    'vnp_TmnCode': VNP_TMN_CODE,
    'vnp_Locale': 'vn',
    'vnp_CurrCode': 'VND',
    'vnp_TxnRef': orderId,
    'vnp_OrderInfo': 'Thanh toan don hang:' + orderId,
    'vnp_OrderType': 'other',
    'vnp_Amount': amount * 100,
    'vnp_ReturnUrl': 'http://localhost:3000/api/payments/vnpay-return',
    'vnp_IpAddr': '127.0.0.1',
    'vnp_CreateDate': createDate
};

console.log('=== Original Params ===');
console.log(JSON.stringify(vnp_Params, null, 2));

vnp_Params = sortObject(vnp_Params);

console.log('\n=== After sortObject ===');
console.log(JSON.stringify(vnp_Params, null, 2));

const signData = qs.stringify(vnp_Params, { encode: false });
console.log('\n=== Sign Data ===');
console.log(signData);

const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

console.log('\n=== Secure Hash ===');
console.log(signed);

vnp_Params['vnp_SecureHash'] = signed;
const finalUrl = VNP_URL + '?' + qs.stringify(vnp_Params, { encode: false });

console.log('\n=== Final URL ===');
console.log(finalUrl);
console.log('\n=== URL Length ===');
console.log(finalUrl.length);
