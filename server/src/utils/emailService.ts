import nodemailer from 'nodemailer'

// Email service for sending notifications
class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // In a real app, configure with actual SMTP settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: (process.env.SMTP_EMAIL || process.env.SMTP_USER) ? {
        user: process.env.SMTP_EMAIL || process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
      } : undefined
    })
  }

  // Send order confirmation email
  async sendOrderConfirmation(order: any, userEmail: string) {
    try {
      const mailOptions = {
                from: process.env.FROM_EMAIL || 'noreply@midgetmicrodrivesandrides.shop',
        to: userEmail,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Order Confirmation</h1>
            <p>Thank you for your order! Here are the details:</p>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2>Order #${order.orderNumber}</h2>
              <p><strong>Total Amount:</strong> $${order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>

            <h3>Items Ordered:</h3>
            <ul>
              ${order.items.map((item: any) => `
                <li style="margin-bottom: 10px;">
                  <strong>${item.product.name}</strong><br>
                  Quantity: ${item.quantity}<br>
                  Price: $${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </li>
              `).join('')}
            </ul>

            <p>We'll send you another email when your order ships.</p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>Thank you for shopping with us!</p>
              <p><strong>Midget Micro Drive & Rides Team</strong></p>
            </div>
          </div>
        `
      }

      // In development, just log the email instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:', mailOptions)
        return { success: true }
      }

      const result = await this.transporter.sendMail(mailOptions)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Failed to send order confirmation email:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(order: any, userEmail: string) {
    try {
      const statusMessages: { [key: string]: string } = {
        PROCESSING: 'Your order is being prepared for shipment.',
        SHIPPED: 'Your order has been shipped and is on its way!',
        DELIVERED: 'Your order has been delivered. Thank you for shopping with us!'
      }

      const mailOptions = {
                from: process.env.FROM_EMAIL || 'noreply@midgetmicrodrivesandrides.shop',
        to: userEmail,
        subject: `Order Update - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Order Status Update</h1>

            <p>Your order status has been updated:</p>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2>Order #${order.orderNumber}</h2>
              <p><strong>New Status:</strong> ${order.status}</p>
              <p><strong>Message:</strong> ${statusMessages[order.status] || 'Your order status has been updated.'}</p>
              <p><strong>Updated:</strong> ${new Date(order.updatedAt).toLocaleDateString()}</p>
            </div>

            ${order.status === 'SHIPPED' ? `
              <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Shipping Information</h3>
                <p>Track your package or contact us if you have any questions about delivery.</p>
              </div>
            ` : ''}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>Thank you for shopping with us!</p>
              <p><strong>Midget Micro Drive & Rides Team</strong></p>
            </div>
          </div>
        `
      }

      // In development, just log the email instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:', mailOptions)
        return { success: true }
      }

      const result = await this.transporter.sendMail(mailOptions)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Failed to send order status update email:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string) {
    try {
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@trendstore.com',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Password Reset</h1>

            <p>You requested a password reset for your account.</p>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
                Reset Password
              </a>
              <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
              <p><small>${resetUrl}</small></p>
            </div>

            <p><small>This link will expire in 1 hour for security reasons.</small></p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>If you didn't request this reset, please ignore this email.</p>
              <p><strong>Midget Micro Drive & Rides Team</strong></p>
            </div>
          </div>
        `
      }

      // In development, just log the email instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:', mailOptions)
        return { success: true }
      }

      const result = await this.transporter.sendMail(mailOptions)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const emailService = new EmailService()