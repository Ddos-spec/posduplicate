// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', function() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// Toggle submenu
function toggleSubmenu(menuId) {
  const submenu = document.getElementById(menuId);
  const chevron = document.getElementById(menuId + '-chevron');

  if (submenu) {
    submenu.classList.toggle('open');
  }
  if (chevron) {
    chevron.classList.toggle('open');
  }
}

// Load page content
async function loadPage(pageName) {
  const contentArea = document.getElementById('main-content-area');

  try {
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) {
      throw new Error('Page not found');
    }

    const html = await response.text();
    contentArea.innerHTML = html;

    // Update active menu item
    document.querySelectorAll('.menu-item, .submenu-item').forEach(item => {
      item.classList.remove('active');
    });

    const activeItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    // Reinitialize icons after loading new content
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Initialize charts if on dashboard or reports page
    if (pageName === 'dashboard') {
      initDashboardCharts();
    } else if (pageName === 'reports') {
      setTimeout(() => initReportsCharts(), 100);
    }

  } catch (error) {
    contentArea.innerHTML = `
      <div class="empty-state">
        <i data-lucide="alert-circle"></i>
        <p>Page not found</p>
        <small>${error.message}</small>
      </div>
    `;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}

// Initialize dashboard charts
function initDashboardCharts() {
  const weekCtx = document.getElementById('weekChart');
  if (weekCtx) {
    new Chart(weekCtx, {
      type: 'bar',
      data: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          data: [0, 0, 0, 1655000, 0, 0, 0],
          backgroundColor: '#3498db',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  const hourlyCtx = document.getElementById('hourlyChart');
  if (hourlyCtx) {
    new Chart(hourlyCtx, {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => i),
        datasets: [{
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1200000,0,0,0,0],
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: '#3498db',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }
}

// Initialize reports charts
function initReportsCharts() {
  const salesCtx = document.getElementById('salesChart');
  if (salesCtx) {
    new Chart(salesCtx, {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Gross Sales',
          data: [1200000, 1350000, 1450000, 1655000],
          backgroundColor: '#3498db',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'Rp. ' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }
}

// Load dashboard by default on page load
window.addEventListener('DOMContentLoaded', function() {
  loadPage('dashboard');
});
