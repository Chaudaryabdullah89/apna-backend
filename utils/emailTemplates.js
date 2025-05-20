const getEmailTemplate = (type, data) => {
  // Validate data object
  if (!data) {
    throw new Error('Email data is required');
  }

  // Common styles
  const styles = {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',
    header: 'background-color: #1a1a1a; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center;',
    content: 'background-color: #ffffff; padding: 30px 20px; border-radius: 0 0 8px 8px;',
    title: 'color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;',
    subtitle: 'color: #ffffff; margin: 10px 0 0; font-size: 16px; opacity: 0.8;',
    section: 'background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;',
    button: 'background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;',
    footer: 'text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;',
    socialLinks: 'margin: 20px 0;',
    socialIcon: 'display: inline-block; margin: 0 10px;',
    divider: 'border-top: 1px solid #e5e7eb; margin: 20px 0;',
    highlight: 'background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0;',
    badge: 'display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;',
    price: 'font-size: 20px; font-weight: 600; color: #2563eb;',
    oldPrice: 'text-decoration: line-through; color: #6b7280; margin-right: 8px;',
    discount: 'background-color: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;'
  };

  const templates = {
    welcome: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.title}">Welcome to Our Store! 🎉</h1>
          <p style="${styles.subtitle}">We're thrilled to have you join our community</p>
        </div>
        <div style="${styles.content}">
          <p style="color: #374151; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #374151; line-height: 1.6;">Thank you for registering with us. We're excited to have you on board and can't wait to help you discover amazing products!</p>
          
          <div style="${styles.highlight}">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">Your Account Benefits:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>Exclusive member-only discounts</li>
              <li>Early access to new products</li>
              <li>Faster checkout process</li>
              <li>Order tracking and history</li>
            </ul>
          </div>

          <p style="color: #374151; line-height: 1.6;">To get started, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl || '#'}" style="${styles.button}">Verify Email Address</a>
          </div>

          <div style="${styles.highlight}">
            <p style="color: #1f2937; margin: 0; font-weight: 500;">Need Help?</p>
            <p style="color: #4b5563; margin: 5px 0 0;">Our support team is available 24/7 to assist you.</p>
            <p style="color: #4b5563; margin: 5px 0 0;">Email: support@store.com</p>
          </div>

          <div style="${styles.footer}">
            <div style="${styles.socialLinks}">
              <a href="#" style="${styles.socialIcon}">Facebook</a>
              <a href="#" style="${styles.socialIcon}">Twitter</a>
              <a href="#" style="${styles.socialIcon}">Instagram</a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">This link will expire in 24 hours.</p>
            <p style="color: #6b7280; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    `,

    passwordReset: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl || '#'}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; line-height: 1.6;">If you didn't request a password reset, you can safely ignore this email.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
        </div>
      </div>
    `,

    orderConfirmation: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.title}">Order Confirmation 🛍️</h1>
          <p style="${styles.subtitle}">Thank you for your purchase!</p>
        </div>
        <div style="${styles.content}">
          <p style="color: #374151; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #374151; line-height: 1.6;">Thank you for your order! We're excited to prepare your items for shipping.</p>

          <div style="${styles.section}">
            <h2 style="color: #1f2937; margin: 0 0 15px 0;">Order Summary</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Order Number:</span>
              <span style="color: #1f2937; font-weight: 500;">${data.orderNumber || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Order Date:</span>
              <span style="color: #1f2937; font-weight: 500;">${data.orderDate || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Payment Method:</span>
              <span style="color: #1f2937; font-weight: 500;">${data.paymentMethod || 'Credit Card'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Shipping Method:</span>
              <span style="color: #1f2937; font-weight: 500;">${data.shippingMethod || 'Standard Shipping'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Estimated Delivery:</span>
              <span style="color: #1f2937; font-weight: 500;">${data.estimatedDelivery || '3-5 business days'}</span>
            </div>
            <div style="${styles.divider}"></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Subtotal:</span>
              <span style="color: #1f2937;">$${(data.subtotal || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Shipping:</span>
              <span style="color: #1f2937;">$${(data.shippingCost || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #4b5563;">Tax:</span>
              <span style="color: #1f2937;">$${(data.tax || 0).toFixed(2)}</span>
            </div>
            <div style="${styles.divider}"></div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #1f2937; font-weight: 600;">Total:</span>
              <span style="${styles.price}">$${(data.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div style="${styles.section}">
            <h2 style="color: #1f2937; margin: 0 0 15px 0;">Shipping Address</h2>
            <p style="color: #4b5563; margin: 0;">${data.shippingAddress?.street || 'N/A'}</p>
            <p style="color: #4b5563; margin: 5px 0;">${data.shippingAddress?.city || 'N/A'}, ${data.shippingAddress?.state || 'N/A'} ${data.shippingAddress?.zip || 'N/A'}</p>
            <p style="color: #4b5563; margin: 5px 0;">${data.shippingAddress?.country || 'N/A'}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.trackingUrl || '#'}" style="${styles.button}">Track Your Order</a>
          </div>

          <div style="${styles.highlight}">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">What's Next?</h3>
            <ol style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>We'll send you a shipping confirmation email when your order ships</li>
              <li>Track your package using the tracking number provided</li>
              <li>Review your purchase after delivery</li>
            </ol>
          </div>

          <div style="${styles.footer}">
            <div style="${styles.socialLinks}">
              <a href="#" style="${styles.socialIcon}">Facebook</a>
              <a href="#" style="${styles.socialIcon}">Twitter</a>
              <a href="#" style="${styles.socialIcon}">Instagram</a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </div>
    `,

    orderStatusUpdate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; text-align: center;">Order Status Update</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #666; line-height: 1.6;">Your order status has been updated:</p>
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #333; margin: 0;"><strong>Order Number:</strong> ${data.orderNumber || 'N/A'}</p>
            <p style="color: #333; margin: 10px 0;"><strong>New Status:</strong> ${data.status || 'N/A'}</p>
            <p style="color: #333; margin: 0;"><strong>Updated At:</strong> ${data.updatedAt || 'N/A'}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">You can track your order status by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.trackingUrl || '#'}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Order</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `,

    shippingNotification: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; text-align: center;">Your Order Has Shipped!</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #666; line-height: 1.6;">Great news! Your order has been shipped and is on its way to you.</p>
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #333; margin: 0;"><strong>Order Number:</strong> ${data.orderNumber || 'N/A'}</p>
            <p style="color: #333; margin: 10px 0;"><strong>Shipping Carrier:</strong> ${data.carrier || 'N/A'}</p>
            <p style="color: #333; margin: 10px 0;"><strong>Tracking Number:</strong> ${data.trackingNumber || 'N/A'}</p>
            <p style="color: #333; margin: 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery || 'N/A'}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">Track your package by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.trackingUrl || '#'}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Package</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you have any questions about your shipment, please contact our support team.</p>
        </div>
      </div>
    `,

    deliveryConfirmation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; text-align: center;">Order Delivered!</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #666; line-height: 1.6;">Your order has been delivered successfully!</p>
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #333; margin: 0;"><strong>Order Number:</strong> ${data.orderNumber || 'N/A'}</p>
            <p style="color: #333; margin: 10px 0;"><strong>Delivered At:</strong> ${data.deliveredAt || 'N/A'}</p>
            <p style="color: #333; margin: 0;"><strong>Delivery Location:</strong> ${data.deliveryLocation || 'N/A'}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">We hope you love your purchase! If you have any questions or need assistance, please don't hesitate to contact us.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.feedbackUrl || '#'}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Leave Feedback</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Thank you for shopping with us!</p>
        </div>
      </div>
    `,

    abandonedCart: data.items ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; text-align: center;">Complete Your Purchase</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #666; line-height: 1.6;">We noticed you left some items in your cart. Would you like to complete your purchase?</p>
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Items in your cart:</h2>
            ${data.items.map(item => `
              <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <img src="${item.image || ''}" alt="${item.name || 'Product'}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 15px; border-radius: 4px;">
                <div>
                  <p style="color: #333; margin: 0; font-weight: 500;">${item.name || 'Product'}</p>
                  <p style="color: #666; margin: 5px 0;">Quantity: ${item.quantity || 0}</p>
                  <p style="color: #333; margin: 0;">$${(item.price || 0).toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
            <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 15px;">
              <p style="color: #333; margin: 0; text-align: right; font-weight: 500;">Total: $${(data.total || 0).toFixed(2)}</p>
            </div>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.cartUrl || '#'}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Return to Cart</a>
          </div>
          <p style="color: #666; line-height: 1.6;">Items in your cart are reserved for 24 hours.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you have any questions, please contact our support team.</p>
        </div>
      </div>
    ` : '',

    backInStock: data.product ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h1 style="color: #333; text-align: center;">Back in Stock!</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #666; line-height: 1.6;">Good news! The item you were waiting for is back in stock:</p>
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <div style="display: flex; align-items: center;">
              <img src="${data.product.image || ''}" alt="${data.product.name || 'Product'}" style="width: 100px; height: 100px; object-fit: cover; margin-right: 20px; border-radius: 4px;">
              <div>
                <h2 style="color: #333; margin: 0 0 10px 0;">${data.product.name || 'Product'}</h2>
                <p style="color: #666; margin: 0 0 10px 0;">${data.product.description || ''}</p>
                <p style="color: #333; margin: 0; font-weight: 500;">$${(data.product.price || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.productUrl || '#'}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Shop Now</a>
          </div>
          <p style="color: #666; line-height: 1.6;">Hurry! This item is in high demand and may sell out quickly.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you have any questions, please contact our support team.</p>
        </div>
      </div>
    ` : '',

    priceDrop: data.product ? `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.title}">Price Drop Alert! 🔥</h1>
          <p style="${styles.subtitle}">Special offer just for you</p>
        </div>
        <div style="${styles.content}">
          <p style="color: #374151; line-height: 1.6;">Hi ${data.name || 'there'},</p>
          <p style="color: #374151; line-height: 1.6;">Great news! The price of an item in your wishlist has dropped. Don't miss this opportunity!</p>

          <div style="${styles.section}">
            <div style="display: flex; align-items: center; gap: 20px;">
              <img src="${data.product.image || ''}" alt="${data.product.name || 'Product'}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;">
              <div style="flex: 1;">
                <h2 style="color: #1f2937; margin: 0 0 10px 0;">${data.product.name || 'Product'}</h2>
                <p style="color: #4b5563; margin: 0 0 15px 0;">${data.product.description || ''}</p>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="${styles.price}">$${(data.product.newPrice || 0).toFixed(2)}</span>
                  <span style="${styles.oldPrice}">$${(data.product.oldPrice || 0).toFixed(2)}</span>
                  <span style="${styles.discount}">${data.product.discount || 0}% OFF</span>
                </div>
              </div>
            </div>
          </div>

          <div style="${styles.highlight}">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">Why Buy Now?</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>Limited time offer</li>
              <li>Limited stock available</li>
              <li>Free shipping on orders over $50</li>
              <li>30-day money-back guarantee</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.productUrl || '#'}" style="${styles.button}">Shop Now</a>
          </div>

          <div style="${styles.section}">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">Product Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <p style="color: #4b5563; margin: 0;"><strong>Brand:</strong> ${data.product.brand || 'N/A'}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Category:</strong> ${data.product.category || 'N/A'}</p>
              </div>
              <div>
                <p style="color: #4b5563; margin: 0;"><strong>Rating:</strong> ${data.product.rating || 'N/A'}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Reviews:</strong> ${data.product.reviews || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div style="${styles.footer}">
            <div style="${styles.socialLinks}">
              <a href="#" style="${styles.socialIcon}">Facebook</a>
              <a href="#" style="${styles.socialIcon}">Twitter</a>
              <a href="#" style="${styles.socialIcon}">Instagram</a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">This special price is available for a limited time only!</p>
          </div>
        </div>
      </div>
    ` : '',

    newsletterWelcome: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.title}">Welcome to Our Newsletter! 🎉</h1>
          <p style="${styles.subtitle}">Stay updated with our latest products and offers</p>
        </div>
        <div style="${styles.content}">
          <p style="color: #374151; line-height: 1.6;">Thank you for subscribing to our newsletter!</p>
          <p style="color: #374151; line-height: 1.6;">You'll now receive:</p>
          <ul style="color: #4b5563; margin: 15px 0; padding-left: 20px;">
            <li>Weekly product updates</li>
            <li>Exclusive discounts and offers</li>
            <li>New collection announcements</li>
            <li>Fashion tips and trends</li>
          </ul>
          
          <div style="${styles.highlight}">
            <p style="color: #1f2937; margin: 0;">Your first exclusive offer is coming soon!</p>
          </div>

          <div style="${styles.footer}">
            <p style="color: #6b7280; font-size: 12px;">You can unsubscribe at any time by clicking the unsubscribe link in our emails.</p>
          </div>
        </div>
      </div>
    `,

    contactConfirmation: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.title}">Thank You for Contacting Us!</h1>
          <p style="${styles.subtitle}">We've received your message</p>
        </div>
        <div style="${styles.content}">
          <p style="color: #374151; line-height: 1.6;">Hi ${data.name},</p>
          <p style="color: #374151; line-height: 1.6;">Thank you for reaching out to us. We've received your message regarding "${data.subject}" and will get back to you as soon as possible.</p>
          
          <div style="${styles.highlight}">
            <p style="color: #1f2937; margin: 0;">What happens next?</p>
            <ul style="color: #4b5563; margin: 10px 0 0; padding-left: 20px;">
              <li>Our team will review your message</li>
              <li>We'll respond within 24-48 hours</li>
              <li>If urgent, please call our support line</li>
            </ul>
          </div>

          <div style="${styles.footer}">
            <p style="color: #6b7280; font-size: 12px;">This is an automated response. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `,

    contactNotification: `
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.title}">New Contact Form Submission</h1>
          <p style="${styles.subtitle}">Action required</p>
        </div>
        <div style="${styles.content}">
          <div style="${styles.highlight}">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">Contact Details:</h3>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Name:</strong> ${data.name}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Subject:</strong> ${data.subject}</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">Message:</h3>
            <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${data.message}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${data.email}" style="${styles.button}">Reply to Customer</a>
          </div>

          <div style="${styles.footer}">
            <p style="color: #6b7280; font-size: 12px;">Please respond to this inquiry within 24 hours.</p>
          </div>
        </div>
      </div>
    `
  };

  const template = templates[type];
  if (!template) {
    throw new Error(`No email template found for type: ${type}`);
  }

  return template;
};

const contactFormTemplate = (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
    </div>
`;

const contactConfirmationTemplate = (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Thank You for Contacting Us</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <p>Dear ${data.name},</p>
            <p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p>
            <p>Best regards,<br>Your Team</p>
        </div>
    </div>
`;

const newsletterConfirmationTemplate = (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to Our Newsletter!</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <p>Thank you for subscribing to our newsletter!</p>
            <p>You will now receive updates about our latest products, promotions, and news.</p>
            <p>Best regards,<br>Your Team</p>
        </div>
    </div>
`;

module.exports = {
  getEmailTemplate,
  contactFormTemplate,
  contactConfirmationTemplate,
  newsletterConfirmationTemplate
}; 