// frontend/src/components/common/InvoiceTemplate.jsx
import React, { forwardRef } from "react";
import {
  BRAND_CONTACT_LINE,
  BRAND_DETAILS,
  BRAND_DOCUMENT_TITLES,
} from "../../constants/branding";

export const InvoiceTemplate = forwardRef(function InvoiceTemplate({ order }, ref) {
  if (!order) return null;

  const formatCurrency = (amount) => `Rs ${Number(amount || 0).toFixed(2)}`;

  // If `totalPrice` is after discount, rebuild subtotal = total + discount
  const discountAmount = Number(order?.discount?.amount || 0);
  const subTotal = Number(order?.totalPrice || 0) + discountAmount;

  const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date();
  const invoiceId =
    order?.orderNumber ||
    order?.stripeSessionId?.slice(-10)?.toUpperCase() ||
    String(order?._id || "").slice(-8).toUpperCase();

  // Safe getters (avoid crashes if fields missing)
  const customer = order?.customer || {};
  const shipping = order?.shippingAddress || {};
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const templateOptions = order?.templateOptions || {};

  const showBillingDetails =
    templateOptions.showBillingDetails ?? templateOptions.showCustomerSection ?? true;
  const showOrderSummary =
    templateOptions.showOrderSummary ?? templateOptions.showMetaSummary ?? true;
  const showFooter = templateOptions.showFooter ?? true;
  const footerLines = Array.isArray(templateOptions.footerLines)
    ? templateOptions.footerLines
    : [
        "Thank you for your business!",
        "If you have any questions about this invoice, please contact us.",
      ];

  const billingSection =
    showBillingDetails && (
      <div>
        <h3 className="font-semibold mb-1">Bill To:</h3>
        <p>{customer.name || "—"}</p>
        <p>{shipping.addressLine1 || "—"}</p>
        <p>
          {shipping.city || "—"}
          {shipping.postalCode ? `, ${shipping.postalCode}` : ""}
        </p>
        <p>{customer.email || "—"}</p>
      </div>
    );

  const summarySection =
    showOrderSummary && (
      <div
        className={`text-right ${
          billingSection ? "" : "col-span-2 md:col-span-1"
        }`}
      >
        <p className="font-semibold">
          Order Status: <span className="font-normal">{order?.status || "—"}</span>
        </p>
        <p className="font-semibold">
          Payment Method: <span className="font-normal">{order?.paymentMethod || "Stripe (Card)"}</span>
        </p>
      </div>
    );

  return (
    <div ref={ref} className="p-8 bg-white text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-start pb-4 border-b-2 border-green-600">
        <div>
         <h1 className="text-3xl font-bold text-green-700">{BRAND_DETAILS.name}</h1>
          <p className="text-sm">{BRAND_DETAILS.address}</p>
          <p className="text-sm">{BRAND_CONTACT_LINE}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold uppercase text-gray-500">
            {BRAND_DOCUMENT_TITLES.invoice}
          </h2>
          <p className="text-sm">Invoice #: {invoiceId || "—"}</p>
          <p className="text-sm">Date: {createdAt.toLocaleDateString()}</p>
        </div>
      </header>

      {/* Customer / Meta */}
      {(billingSection || summarySection) && (
        <section
          className={`grid gap-8 my-8 ${
            billingSection && summarySection ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {billingSection}
          {summarySection}
        </section>
      )}

      {/* Items */}
      <section>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-semibold">Item Description</th>
              <th className="p-3 text-center font-semibold">Quantity</th>
              <th className="p-3 text-right font-semibold">Unit Price</th>
              <th className="p-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const qty = Number(item?.qty || 0);
              const price = Number(item?.price || 0);
              return (
                <tr key={idx}>
                  <td className="p-3">{item?.name || "—"}</td>
                  <td className="p-3 text-center">{qty}</td>
                  <td className="p-3 text-right">{formatCurrency(price)}</td>
                  <td className="p-3 text-right font-medium">
                    {formatCurrency(price * qty)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300">
            <tr>
              <td colSpan={3} className="p-3 text-right font-semibold">
                Subtotal
              </td>
              <td className="p-3 text-right">{formatCurrency(subTotal)}</td>
            </tr>
            {discountAmount > 0 && (
              <tr>
                <td colSpan={3} className="p-3 text-right font-semibold">
                  Discount
                </td>
                <td className="p-3 text-right text-red-600">
                  - {formatCurrency(discountAmount)}
                </td>
              </tr>
            )}
            <tr className="bg-gray-100">
              <td colSpan={3} className="p-3 text-right text-xl font-bold">
                Total
              </td>
              <td className="p-3 text-right text-xl font-bold">
                {formatCurrency(order?.totalPrice)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Footer */}
      {showFooter && (
        <footer className="mt-12 text-center text-gray-500 text-sm">
          {footerLines.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </footer>
      )}
    </div>
  );
});
