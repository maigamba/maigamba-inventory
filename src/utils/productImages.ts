/**
 * Curated, high-resolution hardware photography for computer and electronics inventory.
 * Fallback mapping based on product name, category, or model.
 */

const HARDWARE_IMAGES: Record<string, string> = {
  // Laptops & Notebooks
  laptop_dell: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
  laptop_macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
  laptop_hp: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
  laptop_thinkpad: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=600&q=80',
  laptop_gaming: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
  
  // Desktops & All-In-Ones
  desktop_workstation: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=80',
  desktop_imac: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
  
  // Displays & Monitors
  monitor_dell: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
  monitor_curved: 'https://images.unsplash.com/photo-1551645120-d70bfe84c826?auto=format&fit=crop&w=600&q=80',
  
  // Printers & Scanners
  printer_thermal: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=600&q=80',
  printer_laser: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=600&q=80',
  scanner_barcode: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',

  // Storage (SSDs & Hard Drives)
  storage_ssd: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80',
  storage_nvme: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80',
  storage_hdd: 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?auto=format&fit=crop&w=600&q=80',

  // Memory & Components
  ram_memory: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=600&q=80',
  gpu_card: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
  motherboard: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',

  // Networking & Peripherals
  networking_router: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
  keyboard_mechanical: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
  mouse_wireless: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
  power_ups: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
  cables_accessories: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
};

const DEFAULT_HARDWARE_IMAGE = 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=600&q=80';

/**
 * Resolves a crisp professional image URL for any computer hardware product.
 */
export function getProductImageUrl(
  productImage?: string | null,
  productName?: string,
  categoryName?: string,
  model?: string
): string {
  if (productImage && productImage.trim().startsWith('http')) {
    return productImage.trim();
  }

  const text = `${productName || ''} ${categoryName || ''} ${model || ''}`.toLowerCase();

  if (text.includes('macbook') || text.includes('apple') || text.includes('m1') || text.includes('m2') || text.includes('m3')) {
    return HARDWARE_IMAGES.laptop_macbook;
  }
  if (text.includes('dell') && (text.includes('latitude') || text.includes('xps') || text.includes('inspiron') || text.includes('laptop'))) {
    return HARDWARE_IMAGES.laptop_dell;
  }
  if (text.includes('thinkpad') || text.includes('lenovo')) {
    return HARDWARE_IMAGES.laptop_thinkpad;
  }
  if (text.includes('hp') && (text.includes('elitebook') || text.includes('probook') || text.includes('pavilion') || text.includes('laptop'))) {
    return HARDWARE_IMAGES.laptop_hp;
  }
  if (text.includes('gaming') || text.includes('alienware') || text.includes('rog') || text.includes('legion')) {
    return HARDWARE_IMAGES.laptop_gaming;
  }
  if (text.includes('laptop') || text.includes('notebook')) {
    return HARDWARE_IMAGES.laptop_dell;
  }
  if (text.includes('monitor') || text.includes('display') || text.includes('screen') || text.includes('curved') || text.includes('4k')) {
    return HARDWARE_IMAGES.monitor_curved;
  }
  if (text.includes('desktop') || text.includes('workstation') || text.includes('tower') || text.includes('optiplex')) {
    return HARDWARE_IMAGES.desktop_workstation;
  }
  if (text.includes('imac') || text.includes('all-in-one') || text.includes('aio')) {
    return HARDWARE_IMAGES.desktop_imac;
  }
  if (text.includes('printer') || text.includes('epson') || text.includes('thermal') || text.includes('pos-80')) {
    return HARDWARE_IMAGES.printer_thermal;
  }
  if (text.includes('scanner') || text.includes('barcode') || text.includes('honeywell') || text.includes('zebra')) {
    return HARDWARE_IMAGES.scanner_barcode;
  }
  if (text.includes('ssd') || text.includes('nvme') || text.includes('solid state') || text.includes('m.2')) {
    return HARDWARE_IMAGES.storage_ssd;
  }
  if (text.includes('hdd') || text.includes('hard drive') || text.includes('seagate') || text.includes('wd')) {
    return HARDWARE_IMAGES.storage_hdd;
  }
  if (text.includes('ram') || text.includes('memory') || text.includes('ddr4') || text.includes('ddr5')) {
    return HARDWARE_IMAGES.ram_memory;
  }
  if (text.includes('gpu') || text.includes('graphics') || text.includes('rtx') || text.includes('gtx') || text.includes('nvidia')) {
    return HARDWARE_IMAGES.gpu_card;
  }
  if (text.includes('motherboard') || text.includes('board') || text.includes('cpu') || text.includes('processor')) {
    return HARDWARE_IMAGES.motherboard;
  }
  if (text.includes('router') || text.includes('switch') || text.includes('cisco') || text.includes('mikrotik') || text.includes('tp-link') || text.includes('wifi')) {
    return HARDWARE_IMAGES.networking_router;
  }
  if (text.includes('keyboard') || text.includes('keypad')) {
    return HARDWARE_IMAGES.keyboard_mechanical;
  }
  if (text.includes('mouse') || text.includes('trackpad') || text.includes('logitech')) {
    return HARDWARE_IMAGES.mouse_wireless;
  }
  if (text.includes('ups') || text.includes('inverter') || text.includes('battery') || text.includes('apc')) {
    return HARDWARE_IMAGES.power_ups;
  }
  if (text.includes('cable') || text.includes('adapter') || text.includes('charger') || text.includes('hdmi') || text.includes('usb')) {
    return HARDWARE_IMAGES.cables_accessories;
  }

  return DEFAULT_HARDWARE_IMAGE;
}
