// ============================================
// SMARTBILL INTERACTIVE ANIMATIONS
// Complete animation library for better UX
// ============================================

// Add ripple effect to buttons
function addRippleEffect() {
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            // Remove any existing ripple
            const existingRipple = this.querySelector('.ripple');
            if (existingRipple) existingRipple.remove();
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Add ripple CSS if not already present
function addRippleCSS() {
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            .btn {
                position: relative;
                overflow: hidden;
            }
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple-animation 0.6s linear;
                pointer-events: none;
                z-index: 10;
            }
            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Show confetti animation for success
function showConfetti(duration = 3000, count = 100) {
    const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = Math.random() * 10 + 4 + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.animationDuration = Math.random() * 2 + 1 + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.position = 'fixed';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '2px';
        confetti.style.opacity = '0.8';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            if (confetti && confetti.remove) confetti.remove();
        }, duration);
    }
}

// Show firework effect (advanced confetti)
function showFirework(x, y) {
    const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('firework-particle');
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = Math.random() * 5 + 3;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.opacity = '1';
        
        document.body.appendChild(particle);
        
        let opacity = 1;
        let posX = x;
        let posY = y;
        
        const animate = () => {
            posX += vx;
            posY += vy;
            opacity -= 0.02;
            
            particle.style.left = posX + 'px';
            particle.style.top = posY + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        requestAnimationFrame(animate);
    }
}

// Animate number counting
function animateNumber(element, start, end, duration = 1000, suffix = '') {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current.toLocaleString() + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Add scroll reveal animation
function addScrollReveal() {
    const elements = document.querySelectorAll('.card, .stat-card, .group-card, .bill-item, .feature-card, .member-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 50);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(el => observer.observe(el));
}

// Add hover shake effect for delete buttons
function addDeleteHoverEffect() {
    document.querySelectorAll('.delete-btn, .btn-danger').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.animation = 'shake 0.5s ease';
        });
        btn.addEventListener('animationend', () => {
            btn.style.animation = '';
        });
    });
}

// Animate progress bars
function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const targetWidth = bar.style.width;
        if (targetWidth) {
            bar.style.width = '0';
            setTimeout(() => {
                bar.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.width = targetWidth;
            }, 100);
        }
    });
}

// Add typing animation to headings
function addTypingAnimation() {
    const headings = document.querySelectorAll('[data-typing]');
    headings.forEach(heading => {
        const text = heading.getAttribute('data-typing') || heading.textContent;
        heading.textContent = '';
        let i = 0;
        const type = setInterval(() => {
            if (i < text.length) {
                heading.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(type);
            }
        }, 50);
    });
}

// Add loading animation for AJAX requests
function showLoadingOverlay(message = 'Loading...') {
    const existingOverlay = document.querySelector('.loading-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loader-dots">
                <div></div>
                <div></div>
                <div></div>
            </div>
            <p class="loading-message">${message}</p>
        </div>
    `;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';
    overlay.style.backdropFilter = 'blur(5px)';
    document.body.appendChild(overlay);
    
    return overlay;
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
}

// Add success animation for form submissions
function showSuccessAnimation(element) {
    element.classList.add('success-pulse');
    setTimeout(() => element.classList.remove('success-pulse'), 1000);
}

// Add error shake animation
function showErrorAnimation(element) {
    element.classList.add('error-shake');
    setTimeout(() => element.classList.remove('error-shake'), 500);
}

// Add success pulse CSS
function addSuccessPulseCSS() {
    if (!document.querySelector('#success-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'success-pulse-style';
        style.textContent = `
            @keyframes successPulse {
                0% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                }
                70% {
                    transform: scale(1.05);
                    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                }
            }
            .success-pulse {
                animation: successPulse 0.5s ease-out;
            }
            
            @keyframes errorShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .error-shake {
                animation: errorShake 0.5s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

// Animate element on hover
function addHoverScaleEffect() {
    document.querySelectorAll('.card, .stat-card, .group-card, .bill-item').forEach(el => {
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'translateY(-5px) scale(1.02)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });
}

// Add fade in animation for newly added elements
function fadeInElement(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 10);
}

// Add notification badge bounce
function animateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.classList.add('bounce');
        setTimeout(() => badge.classList.remove('bounce'), 1000);
    }
}

// Add bounce CSS
function addBounceCSS() {
    if (!document.querySelector('#bounce-style')) {
        const style = document.createElement('style');
        style.id = 'bounce-style';
        style.textContent = `
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            .bounce {
                animation: bounce 0.5s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

// Animate on page load
function animateOnLoad() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
}

// Initialize all animations
function initAnimations() {
    addRippleCSS();
    addSuccessPulseCSS();
    addBounceCSS();
    addRippleEffect();
    addScrollReveal();
    addDeleteHoverEffect();
    addHoverScaleEffect();
    
    // Animate numbers on dashboard
    setTimeout(() => {
        document.querySelectorAll('.stat-number, .stat-value, .bill-amount, .activity-amount').forEach(el => {
            const text = el.textContent;
            const match = text.match(/[\d,]+\.?\d*/);
            if (match) {
                const number = parseFloat(match[0].replace(/,/g, ''));
                if (!isNaN(number) && number > 0) {
                    const suffix = text.replace(/[\d,\.]+/, '');
                    animateNumber(el, 0, number, 1000, suffix);
                }
            }
        });
    }, 500);
    
    // Animate progress bars
    setTimeout(animateProgressBars, 500);
    
    // Animate on page load
    animateOnLoad();
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', initAnimations);

// Export functions for global use
window.SmartBillAnimations = {
    showConfetti,
    showFirework,
    showSuccessAnimation,
    showErrorAnimation,
    showLoadingOverlay,
    hideLoadingOverlay,
    animateNumber,
    fadeInElement,
    animateNotificationBadge,
    showConfetti
};

// Make individual functions globally available
window.showConfetti = showConfetti;
window.showSuccessAnimation = showSuccessAnimation;
window.showErrorAnimation = showErrorAnimation;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.animateNumber = animateNumber;
window.animateNotificationBadge = animateNotificationBadge;
window.fadeInElement = fadeInElement;
window.showFirework = showFirework;