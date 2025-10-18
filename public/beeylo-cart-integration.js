(function() {
  'use strict';

  console.log('Beeylo: Cart integration script loaded');

  // Configuration
  const BEEYLO_ATTRIBUTE_KEY = 'Receive_in_Beeylo_App';
  const CHECKBOX_ID = 'beeylo-receive-in-app';

  // Wait for DOM to be ready
  function initBeeylo() {
    // Find cart form
    const cartForm = document.querySelector('form[action="/cart"]') ||
                     document.querySelector('form[action*="/cart"]') ||
                     document.querySelector('[data-cart-form]');

    if (!cartForm) {
      console.warn('Beeylo: Cart form not found, retrying...');
      setTimeout(initBeeylo, 500);
      return;
    }

    console.log('Beeylo: Cart form found, injecting checkbox');

    // Check if already injected
    if (document.getElementById(CHECKBOX_ID)) {
      console.log('Beeylo: Checkbox already exists');
      return;
    }

    // Create checkbox container
    const container = document.createElement('div');
    container.className = 'beeylo-receive-option';
    container.style.cssText = 'margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;';

    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = CHECKBOX_ID;
    checkbox.name = `attributes[${BEEYLO_ATTRIBUTE_KEY}]`;
    checkbox.value = 'Yes';
    checkbox.style.cssText = 'margin-right: 10px; cursor: pointer; width: 18px; height: 18px;';

    // Create label
    const label = document.createElement('label');
    label.htmlFor = CHECKBOX_ID;
    label.style.cssText = 'cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center;';

    // Create label content with icon
    const icon = document.createElement('span');
    icon.innerHTML = '📱';
    icon.style.cssText = 'margin-right: 8px; font-size: 20px;';

    const labelText = document.createElement('span');
    labelText.textContent = 'Receive order updates in the Beeylo app instead of email';

    label.appendChild(checkbox);
    label.appendChild(icon);
    label.appendChild(labelText);

    // Create description
    const description = document.createElement('p');
    description.style.cssText = 'margin: 8px 0 0 28px; font-size: 13px; color: #6c757d; line-height: 1.5;';
    description.innerHTML = 'Get real-time order tracking, delivery notifications, and support directly in your Beeylo app. <a href="https://beeylo.com/app" target="_blank" style="color: #007bff; text-decoration: none;">Download the app</a>';

    container.appendChild(label);
    container.appendChild(description);

    // Insert before checkout button
    const checkoutButton = cartForm.querySelector('[name="checkout"]') ||
                           cartForm.querySelector('button[type="submit"]') ||
                           cartForm.querySelector('.cart__checkout');

    if (checkoutButton) {
      checkoutButton.parentElement.insertBefore(container, checkoutButton);
    } else {
      // If no checkout button found, append to form
      cartForm.appendChild(container);
    }

    // Load saved preference from localStorage
    const savedPreference = localStorage.getItem('beeylo_receive_in_app');
    if (savedPreference === 'true') {
      checkbox.checked = true;
    }

    // Save preference to localStorage when changed
    checkbox.addEventListener('change', function() {
      localStorage.setItem('beeylo_receive_in_app', checkbox.checked);
      console.log('Beeylo: Preference saved:', checkbox.checked);
    });

    console.log('Beeylo: Checkbox injected successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBeeylo);
  } else {
    initBeeylo();
  }

  // Also try to inject on Shopify's cart update events
  if (typeof Shopify !== 'undefined' && Shopify.theme) {
    document.addEventListener('shopify:section:load', initBeeylo);
    document.addEventListener('cart:updated', initBeeylo);
  }
})();
