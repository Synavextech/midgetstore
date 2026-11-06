import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { EventEmitter } from 'events'
import {
  buildReceiptDataFromOrder,
  generateReceiptPdfBuffer,
  generateReceiptText,
  ServerOrderReceiptData
} from './receiptPdf.js'

dotenv.config()

export interface SystemActivityEvent {
  id: string
  type:
    | 'ORDER_CREATED'
    | 'ORDER_PURCHASED'
    | 'USER_REGISTERED'
    | 'USER_LOGIN'
    | 'ORDER_STATUS_UPDATED'
    | 'ORDER_CANCELLED'
    | 'DELIVERY_TIME_UPDATED'
    | 'PENDING_ORDER_REMINDER'
    | 'ITEM_VIEWED'
    | 'PRODUCT_UPDATED'
  title: string
  message: string
  userEmail?: string
  orderNumber?: string
  amount?: number
  emailDispatched: boolean
  systemMailDispatched: boolean
  timestamp: string
}

class EmailService {
  public activityEmitter = new EventEmitter()
  private recentActivities: SystemActivityEvent[] = []

  constructor() {
    this.activityEmitter.setMaxListeners(100)
  }

  private getTransporter(): { transporter: nodemailer.Transporter | null; isConfigured: boolean; fromAddress: string; systemEmails: string[] } {
    const host = process.env.SMTP_HOST || 'mail.privateemail.com'
    const rawPort = parseInt(process.env.SMTP_PORT || '465', 10)
    const port = rawPort === 456 ? 465 : rawPort
    const secure =
      process.env.SMTP_SECURE === 'true' ||
      port === 465

    const user = (process.env.SMTP_USER || process.env.SMTP_EMAIL || '').trim()
    const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim()

    const fromAddress =
      process.env.FROM_EMAIL ||
      (user ? `Midget Micro Drive & Rides <${user}>` : 'Midget Micro Drive & Rides <support@midgetdriftcarsandebikes.shop>')

    const rawSystemEmails = [
      process.env.SYSTEM_NOTIFICATION_EMAIL,
      process.env.ADMIN_EMAIL,
      user,
      'support@midgetdriftcarsandebikes.shop'
    ]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'))

    const systemEmails = Array.from(new Set(rawSystemEmails))

    if (!user || !pass) {
      return {
        transporter: null,
        isConfigured: false,
        fromAddress,
        systemEmails
      }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    })

    return {
      transporter,
      isConfigured: true,
      fromAddress,
      systemEmails
    }
  }

  public recordActivity(event: Omit<SystemActivityEvent, 'id' | 'timestamp'>): SystemActivityEvent {
    const fullEvent: SystemActivityEvent = {
      ...event,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    }
    this.recentActivities.unshift(fullEvent)
    if (this.recentActivities.length > 100) {
      this.recentActivities = this.recentActivities.slice(0, 100)
    }
    this.activityEmitter.emit('activity', fullEvent)
    return fullEvent
  }

  public getRecentActivities(limit: number = 25): SystemActivityEvent[] {
    return this.recentActivities.slice(0, limit)
  }

  private async dispatchMail(mailOptions: nodemailer.SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { transporter, isConfigured, fromAddress } = this.getTransporter()
    const finalOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      ...mailOptions
    }

    if (!isConfigured || !transporter) {
      console.log(
        `📧 [SMTP Notification Queued/Logged - Set SMTP_USER & SMTP_PASS in .env for live relay] To: ${finalOptions.to} | Subject: ${finalOptions.subject}`
      )
      return { success: false, error: 'SMTP credentials not yet configured in .env' }
    }

    try {
      const info = await transporter.sendMail(finalOptions)
      console.log(`✅ [SMTP Sent] To: ${finalOptions.to} | Subject: ${finalOptions.subject} | MessageID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err: any) {
      console.error(`⚠️ [SMTP Send Error] To: ${finalOptions.to} | Subject: ${finalOptions.subject}:`, err?.message || err)
      return { success: false, error: err?.message || 'SMTP dispatch failed' }
    }
  }

  /**
   * Sends real-time purchase confirmation & PDF receipt to the user's account email
   * AND sends a real-time purchase settlement notification & PDF receipt to system/admin mail.
   */
  async sendPurchaseNotifications(
    order: any,
    customerContext?: {
      accountEmail?: string
      shippingEmail?: string
      firstName?: string
      lastName?: string
      fullAddress?: string
    }
  ): Promise<{
    userEmailSent: boolean
    systemEmailSent: boolean
    receiptData: ServerOrderReceiptData
  }> {
    const receiptData = buildReceiptDataFromOrder(order, {
      firstName: customerContext?.firstName,
      lastName: customerContext?.lastName,
      email: customerContext?.accountEmail || customerContext?.shippingEmail,
      address: customerContext?.fullAddress
    })

    const receiptText = generateReceiptText(receiptData)
    const pdfBuffer = generateReceiptPdfBuffer(receiptData)
    const pdfAttachment = {
      filename: `Receipt-${receiptData.orderNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }

    // Collect recipient user emails (declared account creation email + checkout shipping email if different)
    const userRecipients = Array.from(
      new Set(
        [
          customerContext?.accountEmail,
          customerContext?.shippingEmail,
          order.user?.email
        ]
          .filter(Boolean)
          .map((e) => String(e).trim())
          .filter((e) => e.includes('@'))
      )
    )

    const itemsHtml =
      receiptData.items && receiptData.items.length > 0
        ? receiptData.items
            .map(
              (item) => `
              <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;"><strong>${item.name}</strong></td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${item.price}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: bold;">${item.total}</td>
              </tr>`
            )
            .join('')
        : ''

    // 1. Send Purchase Confirmation + PDF Receipt to User Email
    let userEmailSent = false
    if (userRecipients.length > 0) {
      const userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 24px;">
            <span style="background-color: #f59e0b; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Payment Verified & Settled</span>
            <h1 style="margin: 12px 0 4px; font-size: 22px; color: #ffffff;">Order Confirmed • #${receiptData.orderNumber}</h1>
            <p style="margin: 0; font-size: 13px; color: #9ca3af;">Midget Micro Drive & Rides • Official Purchase Receipt (PDF Attached)</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; line-height: 1.6;">Hello <strong>${receiptData.userName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">Thank you for shopping with <strong>Midget Micro Drive & Rides</strong>. Your payment has been verified and your order is registered for express dispatch from our Nanshan, Shenzhen, Guangdong Province, China Warehouse. Your official generated <strong>PDF Receipt (Receipt-${receiptData.orderNumber}.pdf)</strong> is attached to this email.</p>

            ${
              itemsHtml
                ? `
            <h3 style="font-size: 14px; text-transform: uppercase; color: #374151; margin-top: 20px;">Purchased Units</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f3f4f6; text-align: left; font-size: 12px; color: #6b7280;">
                  <th style="padding: 8px 10px;">Item</th>
                  <th style="padding: 8px 10px; text-align: center;">Qty</th>
                  <th style="padding: 8px 10px; text-align: right;">Unit Price</th>
                  <th style="padding: 8px 10px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>`
                : ''
            }

            <h3 style="font-size: 14px; text-transform: uppercase; color: #374151; margin-top: 20px;">Official Receipt Summary</h3>
            <pre style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; overflow-x: auto;">${receiptText}</pre>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Need assistance? Contact our 24/7 Customer Support team at <a href="mailto:support@midgetdriftcarsandebikes.shop" style="color: #d97706;">support@midgetdriftcarsandebikes.shop</a>.</p>
          </div>
        </div>
      `

      const userMailRes = await this.dispatchMail({
        to: userRecipients.join(', '),
        subject: `Official Purchase Receipt & Order Confirmation - #${receiptData.orderNumber}`,
        text: receiptText,
        html: userHtml,
        attachments: [pdfAttachment]
      })
      userEmailSent = userMailRes.success
    }

    // 2. Send Real-Time Purchase Notification + PDF Receipt to System / Admin Mail
    const { systemEmails } = this.getTransporter()
    let systemEmailSent = false
    if (systemEmails.length > 0) {
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827; border: 1px solid #f59e0b; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 20px 24px;">
            <span style="background-color: #10b981; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Real-Time System Alert • Settled Purchase</span>
            <h2 style="margin: 10px 0 2px; font-size: 20px; color: #f59e0b;">New Purchase Order #${receiptData.orderNumber} (${receiptData.finalCost})</h2>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Timestamp: ${new Date().toUTCString()}</p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Customer Name:</td><td style="padding: 6px 0; font-weight: bold;">${receiptData.userName}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Account / User Email:</td><td style="padding: 6px 0; font-weight: bold;">${userRecipients.join(', ') || 'Guest Checkout'}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Payment Source:</td><td style="padding: 6px 0; font-weight: bold;">${receiptData.paymentSource}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Transaction ID:</td><td style="padding: 6px 0; font-family: monospace;">${receiptData.transactionId}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Settled Total (USD):</td><td style="padding: 6px 0; font-weight: bold; color: #059669;">${receiptData.finalCost}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Shipping Address:</td><td style="padding: 6px 0;">${receiptData.address}</td></tr>
            </table>

            <h3 style="font-size: 13px; text-transform: uppercase; color: #374151;">Generated Receipt (PDF Attached)</h3>
            <pre style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; font-family: 'Courier New', Courier, monospace; font-size: 11.5px; line-height: 1.45; white-space: pre-wrap;">${receiptText}</pre>
          </div>
        </div>
      `

      const sysMailRes = await this.dispatchMail({
        to: systemEmails.join(', '),
        subject: `[SYSTEM NOTIFICATION] New Purchase #${receiptData.orderNumber} - ${receiptData.finalCost} (${receiptData.userName})`,
        text: `SYSTEM PURCHASE ALERT\nCustomer Email: ${userRecipients.join(', ')}\n\n${receiptText}`,
        html: adminHtml,
        attachments: [pdfAttachment]
      })
      systemEmailSent = sysMailRes.success
    }

    this.recordActivity({
      type: 'ORDER_PURCHASED',
      title: `New Purchase Settled • #${receiptData.orderNumber}`,
      message: `${receiptData.userName} (${userRecipients[0] || 'Customer'}) completed purchase of ${receiptData.finalCost} via ${receiptData.paymentSource}. PDF Receipt generated.`,
      userEmail: userRecipients[0],
      orderNumber: receiptData.orderNumber,
      amount: Number(order.total || 0),
      emailDispatched: userEmailSent,
      systemMailDispatched: systemEmailSent
    })

    return {
      userEmailSent,
      systemEmailSent,
      receiptData
    }
  }

  /**
   * Sends welcome email to user email declared during account creation
   * AND sends real-time system activity alert to system mail.
   */
  async sendAccountRegistrationNotifications(
    user: { id?: string; email: string; firstName?: string | null; lastName?: string | null; phone?: string | null; role?: string },
    source: string = 'Direct Account Registration'
  ): Promise<{ userEmailSent: boolean; systemEmailSent: boolean }> {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer'
    const storeUrl = process.env.PRODUCTION_url || 'https://midgetdriftcarsandebikes.shop'

    // 1. Welcome email to the newly registered user
    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #111318; color: #ffffff; padding: 24px;">
          <span style="background-color: #f59e0b; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Account Active</span>
          <h1 style="margin: 12px 0 4px; font-size: 22px; color: #ffffff;">Welcome to Midget Micro Drive & Rides!</h1>
        </div>
        <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Your account (<strong style="color: #d97706;">${user.email}</strong>) has been successfully created on <strong>Midget Micro Drive & Rides</strong>.</p>
          <p>All future purchase confirmations, official PDF receipts, and real-time order dispatch updates will be sent directly to this email address.</p>
          <div style="margin: 24px 0;">
            <a href="${storeUrl}" style="background-color: #f59e0b; color: #000000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">Explore Fleet Catalog</a>
          </div>
          <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">Questions? Reach our 24/7 support desk at <a href="mailto:support@midgetdriftcarsandebikes.shop" style="color: #d97706;">support@midgetdriftcarsandebikes.shop</a>.</p>
        </div>
      </div>
    `

    const userRes = await this.dispatchMail({
      to: user.email,
      subject: `Welcome to Midget Micro Drive & Rides - Account Confirmed`,
      text: `Hello ${fullName},\n\nYour account (${user.email}) has been registered at Midget Micro Drive & Rides. All order confirmations and official PDF purchase receipts will be sent to this email.\n\nVisit: ${storeUrl}`,
      html: userHtml
    })

    // 2. Real-time system notification email to Admin/System mail
    const { systemEmails } = this.getTransporter()
    let sysSent = false
    if (systemEmails.length > 0) {
      const sysHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">[System Activity] New User Account Registered</h2>
          </div>
          <div style="padding: 20px 24px; font-size: 13px; line-height: 1.6;">
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Declared Email:</strong> ${user.email}</p>
            <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
            <p><strong>Registration Channel:</strong> ${source}</p>
            <p><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          </div>
        </div>
      `
      const sysRes = await this.dispatchMail({
        to: systemEmails.join(', '),
        subject: `[SYSTEM NOTIFICATION] New Account Registered - ${user.email}`,
        text: `New User Registered\nName: ${fullName}\nEmail: ${user.email}\nChannel: ${source}\nTimestamp: ${new Date().toUTCString()}`,
        html: sysHtml
      })
      sysSent = sysRes.success
    }

    this.recordActivity({
      type: 'USER_REGISTERED',
      title: `New Customer Account • ${fullName}`,
      message: `Account registered for ${user.email} (${source}). Welcome email dispatched.`,
      userEmail: user.email,
      emailDispatched: userRes.success,
      systemMailDispatched: sysSent
    })

    return {
      userEmailSent: userRes.success,
      systemEmailSent: sysSent
    }
  }

  // Backward-compatible wrapper for order confirmation
  async sendOrderConfirmation(order: any, userEmail: string) {
    return this.sendPurchaseNotifications(order, { accountEmail: userEmail })
  }

  // Send order status update email to customer + system notification
  async sendOrderStatusUpdate(order: any, userEmail?: string) {
    const targetEmail = userEmail || order.user?.email
    const receiptData = buildReceiptDataFromOrder(order, { email: targetEmail })
    const pdfBuffer = generateReceiptPdfBuffer(receiptData)
    const deliveryEstimate = order.estimatedDeliveryTime || order.estimated_delivery_time || '21-35 business days (Express Courier from China Hub)'
    const chinaStore = order.storeLocation || order.store_location || 'Shenzhen Technology & Electric Mobility Hub, China'

    const statusMessages: { [key: string]: string } = {
      PENDING: 'Your order has been logged and is awaiting payment settlement or processing.',
      PROCESSING: `Your order payment is settled and our warehouse team at ${chinaStore} is preparing your vehicle for express dispatch.`,
      SHIPPED: `Your order has been dispatched from our ${chinaStore}! Estimated delivery time: ${deliveryEstimate}.`,
      DELIVERED: `Your order has been marked as delivered. Fulfilling China Hub: ${chinaStore}. Thank you for riding with Midget Micro Drive & Rides!`,
      CANCELLED: 'Your order has been cancelled. Contact support if you have any questions.'
    }

    let userSent = false
    if (targetEmail) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 20px; color: #f59e0b;">Order Status Update • #${receiptData.orderNumber}</h2>
          </div>
          <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
            <p>Hello <strong>${receiptData.userName}</strong>,</p>
            <p>The status of your order <strong>#${receiptData.orderNumber}</strong> has been updated to: <strong style="color: #d97706;">${order.status}</strong>.</p>
            <p>${statusMessages[order.status] || 'Your order status has been updated.'}</p>
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px;">
              <p style="margin: 0 0 4px;"><strong>Estimated Delivery Window:</strong> ${deliveryEstimate}</p>
              <p style="margin: 0;"><strong>China Fulfillment Hub:</strong> ${chinaStore}</p>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Your updated PDF purchase receipt is attached for your records.</p>
          </div>
        </div>
      `
      const res = await this.dispatchMail({
        to: targetEmail,
        subject: `Order #${receiptData.orderNumber} Status Update: ${order.status}`,
        text: `Hello ${receiptData.userName},\n\nYour order #${receiptData.orderNumber} status has been updated to ${order.status}.\n${statusMessages[order.status] || ''}\nEstimated Delivery: ${deliveryEstimate}\nHub: ${chinaStore}`,
        html,
        attachments: [
          {
            filename: `Receipt-${receiptData.orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })
      userSent = res.success
    }

    const { systemEmails } = this.getTransporter()
    let sysSent = false
    if (systemEmails.length > 0) {
      const sysRes = await this.dispatchMail({
        to: systemEmails.join(', '),
        subject: `[SYSTEM NOTIFICATION] Order #${receiptData.orderNumber} Status -> ${order.status}`,
        text: `Order #${receiptData.orderNumber} for ${receiptData.userName} (${targetEmail || 'Guest'}) was updated to status: ${order.status}. Delivery Estimate: ${deliveryEstimate}. Hub: ${chinaStore}.`
      })
      sysSent = sysRes.success
    }

    this.recordActivity({
      type: 'ORDER_STATUS_UPDATED',
      title: `Order #${receiptData.orderNumber} -> ${order.status}`,
      message: `Status updated to ${order.status} for ${receiptData.userName} (${targetEmail || 'Customer'}). Delivery: ${deliveryEstimate}.`,
      userEmail: targetEmail,
      orderNumber: receiptData.orderNumber,
      amount: Number(order.total || 0),
      emailDispatched: userSent,
      systemMailDispatched: sysSent
    })

    return { success: userSent || sysSent }
  }

  // Send Order Creation notification to Customer & Admin
  async sendOrderCreationNotification(
    order: any,
    customerContext?: {
      accountEmail?: string
      shippingEmail?: string
      firstName?: string
      lastName?: string
      fullAddress?: string
    }
  ) {
    const targetEmail = customerContext?.accountEmail || customerContext?.shippingEmail || order.user?.email
    const customerName = `${customerContext?.firstName || ''} ${customerContext?.lastName || ''}`.trim() || order.user?.firstName || 'Customer'
    const orderNumber = order.orderNumber || order.order_number
    const totalFormatted = `$${Number(order.total || 0).toFixed(2)}`
    const deliveryEstimate = order.estimatedDeliveryTime || order.estimated_delivery_time || '21-35 business days (Express Courier from China Hub)'
    const chinaStore = order.storeLocation || order.store_location || 'Shenzhen Technology & Electric Mobility Hub, China'

    let userSent = false
    if (targetEmail) {
      const userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 20px 24px;">
            <span style="background-color: #f59e0b; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Order Placed • ${order.status || 'PENDING'}</span>
            <h2 style="margin: 10px 0 2px; font-size: 20px; color: #ffffff;">Order Placed Successfully • #${orderNumber}</h2>
          </div>
          <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Thank you for placing your order with <strong>Midget Micro Drive & Rides</strong>. Your order is registered in our system with status: <strong style="color: #d97706;">${order.status || 'PENDING'}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 180px;">Order Total:</td><td style="padding: 6px 0; font-weight: bold;">${totalFormatted} USD</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Payment Method:</td><td style="padding: 6px 0; font-weight: bold;">${order.paymentMethod || order.payment_method || 'STRIPE'}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Estimated Delivery Time:</td><td style="padding: 6px 0; font-weight: bold; color: #d97706;">${deliveryEstimate}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">China Fulfillment Hub:</td><td style="padding: 6px 0;">${chinaStore}</td></tr>
            </table>
            <p style="font-size: 12px; color: #6b7280;">We will notify you immediately via email when your shipment is underway. If you need any assistance, contact us at support@midgetdriftcarsandebikes.shop.</p>
          </div>
        </div>
      `

      const userRes = await this.dispatchMail({
        to: targetEmail,
        subject: `Order Placed • #${orderNumber} (${totalFormatted}) - Midget Micro Drive & Rides`,
        text: `Hello ${customerName},\nYour order #${orderNumber} (${totalFormatted}) has been logged in our system.\nStatus: ${order.status || 'PENDING'}\nEstimated Delivery: ${deliveryEstimate}\nChina Hub: ${chinaStore}`,
        html: userHtml
      })
      userSent = userRes.success
    }

    const { systemEmails } = this.getTransporter()
    let sysSent = false
    if (systemEmails.length > 0) {
      const sysRes = await this.dispatchMail({
        to: systemEmails.join(', '),
        subject: `[SYSTEM ALERT] New Order Created • #${orderNumber} (${totalFormatted})`,
        text: `New order logged: #${orderNumber}\nCustomer: ${customerName} (${targetEmail || 'Guest'})\nTotal: ${totalFormatted}\nStatus: ${order.status || 'PENDING'}\nDelivery: ${deliveryEstimate}\nHub: ${chinaStore}`
      })
      sysSent = sysRes.success
    }

    this.recordActivity({
      type: 'ORDER_CREATED',
      title: `Order Created • #${orderNumber}`,
      message: `${customerName} created order #${orderNumber} for ${totalFormatted} (${order.status || 'PENDING'}).`,
      userEmail: targetEmail,
      orderNumber,
      amount: Number(order.total || 0),
      emailDispatched: userSent,
      systemMailDispatched: sysSent
    })

    return { userEmailSent: userSent, systemEmailSent: sysSent }
  }

  // Send Pending Order Payment Reminder (> 30 minutes incomplete pay)
  async sendPendingOrderPaymentReminder(order: any) {
    const targetEmail = order.user?.email || order.shippingAddress?.email
    const customerName = order.user?.firstName || order.shippingAddress?.firstName || 'Customer'
    const orderNumber = order.orderNumber || order.order_number
    const totalFormatted = `$${Number(order.total || 0).toFixed(2)}`
    const storeUrl = process.env.PRODUCTION_url || 'https://midgetmicrodrivesandrides.shop'

    let userSent = false
    if (targetEmail) {
      const userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f59e0b; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 20px 24px;">
            <span style="background-color: #f59e0b; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Payment Reminder • Incomplete Payment</span>
            <h2 style="margin: 10px 0 2px; font-size: 20px; color: #f59e0b;">Complete Your Order • #${orderNumber}</h2>
          </div>
          <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>We noticed you initiated order <strong>#${orderNumber}</strong> for <strong>${totalFormatted} USD</strong> over 30 minutes ago, but payment has not yet settled.</p>
            <p>Your vehicles and reserved inventory remain allocated in our China fulfillment hub in <strong>PENDING</strong> status. For all timed and sells, if a payment is canceled or fails, your order status simply remains PENDING so you can resume whenever convenient.</p>
            <div style="margin: 24px 0;">
              <a href="${storeUrl}/checkout" style="background-color: #f59e0b; color: #000000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">Resume Checkout & Complete Payment</a>
            </div>
            <p style="font-size: 12px; color: #6b7280;">If your payment was interrupted or cancelled, you can easily retry using Credit / Debit Card (Stripe) or PayPal Express. Need help? Reply to this email or chat with our 24/7 team.</p>
          </div>
        </div>
      `

      const res = await this.dispatchMail({
        to: targetEmail,
        subject: `Pending Order Payment Reminder: Order #${orderNumber} - Midget Micro Drive & Rides`,
        text: `Hello ${customerName},\nYour order #${orderNumber} for ${totalFormatted} remains PENDING after 30 minutes. Visit ${storeUrl}/checkout to complete your purchase.`,
        html: userHtml
      })
      userSent = res.success
    }

    const { systemEmails } = this.getTransporter()
    let sysSent = false
    if (systemEmails.length > 0) {
      const sysRes = await this.dispatchMail({
        to: systemEmails.join(', '),
        subject: `[SYSTEM ALERT] Pending Order Over 30 Mins Incomplete • #${orderNumber} (${totalFormatted})`,
        text: `Order #${orderNumber} for ${customerName} (${targetEmail || 'Guest'}) has been PENDING for > 30 minutes without completed payment. Total: ${totalFormatted}. Reminder email was dispatched to customer.`
      })
      sysSent = sysRes.success
    }

    this.recordActivity({
      type: 'PENDING_ORDER_REMINDER',
      title: `Pending 30-Min Payment Reminder • #${orderNumber}`,
      message: `Incomplete payment reminder dispatched for order #${orderNumber} (${customerName}, ${totalFormatted}). Status remains PENDING.`,
      userEmail: targetEmail,
      orderNumber,
      amount: Number(order.total || 0),
      emailDispatched: userSent,
      systemMailDispatched: sysSent
    })

    return { userEmailSent: userSent, systemEmailSent: sysSent }
  }

  // Send Delivery Time Updated notification with reason
  async sendDeliveryTimeUpdatedNotification(order: any, estimatedDeliveryTime: string, reason: string) {
    const targetEmail = order.user?.email || order.shippingAddress?.email
    const customerName = order.user?.firstName || order.shippingAddress?.firstName || 'Customer'
    const orderNumber = order.orderNumber || order.order_number
    const chinaStore = order.storeLocation || order.store_location || 'Shenzhen Technology & Electric Mobility Hub, China'

    let userSent = false
    if (targetEmail) {
      const userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #111318; color: #ffffff; padding: 20px 24px;">
            <span style="background-color: #f59e0b; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Delivery Timeline Update</span>
            <h2 style="margin: 10px 0 2px; font-size: 20px; color: #f59e0b;">Delivery Estimated Date Revised • #${orderNumber}</h2>
          </div>
          <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Our logistics dispatch department has updated the delivery estimate for your order <strong>#${orderNumber}</strong>.</p>
            <div style="background-color: #f9fafb; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
              <p style="margin: 0 0 6px; font-size: 14px;"><strong>New Estimated Delivery Time:</strong> <span style="color: #d97706; font-weight: bold;">${estimatedDeliveryTime}</span></p>
              <p style="margin: 0; font-size: 13px; color: #4b5563;"><strong>Reason for Update:</strong> ${reason}</p>
            </div>
            <p style="font-size: 12px; color: #6b7280;">Dispatch Location: ${chinaStore}. Real-time tracking will reflect this adjusted schedule.</p>
          </div>
        </div>
      `
      const res = await this.dispatchMail({
        to: targetEmail,
        subject: `Delivery Time Update for Order #${orderNumber}: ${estimatedDeliveryTime}`,
        text: `Hello ${customerName},\nYour order #${orderNumber} delivery estimate has been updated to: ${estimatedDeliveryTime}.\nReason: ${reason}\nDispatch Hub: ${chinaStore}`,
        html: userHtml
      })
      userSent = res.success
    }

    const { systemEmails } = this.getTransporter()
    let sysSent = false
    if (systemEmails.length > 0) {
      const sysRes = await this.dispatchMail({
        to: systemEmails.join(', '),
        subject: `[SYSTEM NOTIFICATION] Order #${orderNumber} Delivery Time Updated: ${estimatedDeliveryTime}`,
        text: `Order #${orderNumber} delivery time updated to: ${estimatedDeliveryTime}\nReason: ${reason}\nCustomer: ${customerName} (${targetEmail || 'Guest'})`
      })
      sysSent = sysRes.success
    }

    this.recordActivity({
      type: 'DELIVERY_TIME_UPDATED',
      title: `Delivery Time Updated • #${orderNumber}`,
      message: `Revised to "${estimatedDeliveryTime}". Reason: ${reason} (${customerName}).`,
      userEmail: targetEmail,
      orderNumber,
      amount: Number(order.total || 0),
      emailDispatched: userSent,
      systemMailDispatched: sysSent
    })

    return { userEmailSent: userSent, systemEmailSent: sysSent }
  }

  // Record item viewed in activity stream and notify system mail
  async sendItemViewedNotification(viewData: {
    productId: string
    productName: string
    productSku?: string
    productPrice?: number
    userEmail?: string
    userName?: string
    ipAddress?: string
    userAgent?: string
    referrer?: string
    storeLocation?: string
  }) {
    const viewerLabel = viewData.userEmail || viewData.userName || (viewData.ipAddress ? `Visitor (${viewData.ipAddress})` : 'Guest Visitor')
    const priceFormatted = viewData.productPrice ? `$${Number(viewData.productPrice).toFixed(2)}` : ''

    const event = this.recordActivity({
      type: 'ITEM_VIEWED',
      title: `Product Viewed • ${viewData.productName}`,
      message: `${viewerLabel} viewed ${viewData.productName} ${viewData.productSku ? `(SKU: ${viewData.productSku})` : ''} ${priceFormatted ? `[${priceFormatted}]` : ''} - Hub: ${viewData.storeLocation || 'Shenzhen, China'}`,
      userEmail: viewData.userEmail,
      amount: viewData.productPrice,
      emailDispatched: false,
      systemMailDispatched: false
    })

    return event
  }
}

export const emailService = new EmailService()
