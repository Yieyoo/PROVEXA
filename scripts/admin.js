// Admin panel interactions, backed by Supabase (shared, real-time data).
(function(){
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  var sales = [];
  var products = [];
  var editingIndex = null;
  var editingProductIndex = null;
  var orderItems = [];

  function formatFolio(folio){
    return String(folio || 0).padStart(4, '0');
  }
  function formatDate(isoDate){
    if(!isoDate) return '';
    var parts = isoDate.split('-');
    if(parts.length !== 3) return isoDate;
    return Number(parts[2]) + '/' + Number(parts[1]) + '/' + parts[0];
  }

  function calculateOrderTotal(items){
    return items.reduce(function(sum, item){
      return sum + (Number(item.qty) * Number(item.price));
    }, 0);
  }

  function calculateOrderProfit(items){
    return items.reduce(function(sum, item){
      return sum + (Number(item.qty) * (Number(item.price) - Number(item.costPrice || 0)));
    }, 0);
  }

  function productFromDb(row){
    return {id: row.id, name: row.name, category: row.category || '', costPrice: Number(row.cost_price), salePrice: Number(row.sale_price), stock: Number(row.stock)};
  }
  function productToDb(p){
    return {id: p.id, name: p.name, category: p.category || '', cost_price: p.costPrice, sale_price: p.salePrice, stock: p.stock};
  }
  function saleFromDb(row){
    return {id: row.id, folio: row.folio, date: row.date, customer: row.customer, items: row.items || [], status: row.status, total: Number(row.total)};
  }

  async function loadSales(){
    var result = await supabaseClient.from('sales').select('*').order('created_at', {ascending: false});
    if(result.error){ alert('No se pudieron cargar las ventas: ' + result.error.message); return; }
    sales = (result.data || []).map(saleFromDb);
    renderSales();
  }

  async function loadProducts(){
    var result = await supabaseClient.from('products').select('*').order('created_at', {ascending: false});
    if(result.error){ alert('No se pudieron cargar los productos: ' + result.error.message); return; }
    products = (result.data || []).map(productFromDb);
    renderProducts();
  }

  function renderSales(){
    var tbody = $('#salesTable tbody'); tbody.innerHTML = '';
    var total = 0;
    var profitTotal = 0;
    var closedCount = 0;
    sales.forEach(function(s, index){
      var orderSummary = renderOrderSummary(s.items);
      var profit = calculateOrderProfit(s.items || []);
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+formatFolio(s.folio)+'</td><td>'+formatDate(s.date)+'</td><td>'+s.customer+'</td><td>'+orderSummary+'</td>' +
        '<td><select class="sale-status-select" data-index="'+index+'">'+renderStatusOptions(s.status)+'</select></td>' +
        '<td>$'+s.total.toFixed(2)+'</td>' +
        '<td class="profit-cell">$'+profit.toFixed(2)+'</td>' +
        '<td class="action-buttons"><button class="btn ghost small view-order" data-index="'+index+'">Ver</button>' +
        '<button class="btn ghost small edit-sale" data-index="'+index+'">Editar</button>' +
        '<button class="btn danger small delete-sale" data-index="'+index+'">Borrar</button></td>';
      tbody.appendChild(tr);
      total += Number(s.total)||0;
      profitTotal += profit;
      if(s.status === 'Entregado y pagado'){ closedCount += 1; }
    });
    var totalText = '$' + total.toFixed(2);
    $('#salesTotal').textContent = totalText;
    $('#salesTotalCard').textContent = totalText;
    $('#salesProfitTotal').textContent = '$' + profitTotal.toFixed(2);
    $('#profitTotalCard').textContent = '$' + profitTotal.toFixed(2);
    $('#closedSalesCard').textContent = String(closedCount);
    bindSaleRowActions();
  }

  function renderStatusOptions(current){
    var states = ['En proceso de compra','En proceso de entrega','Entregado y pagado'];
    return states.map(function(value){
      return '<option value="'+value+'"'+(value===current ? ' selected' : '')+'>'+value+'</option>';
    }).join('');
  }

  function renderOrderSummary(items){
    if(!items || !items.length) return '<em>Sin artículos</em>';
    if(items.length === 1) return items[0].product + ' x' + items[0].qty;
    return '<strong>'+items[0].product+' x'+items[0].qty+'</strong> + '+(items.length-1)+' más';
  }

  function bindSaleRowActions(){
    $all('.view-order').forEach(function(btn){
      btn.addEventListener('click', function(){ viewOrderDetails(Number(btn.dataset.index)); });
    });
    $all('.edit-sale').forEach(function(btn){
      btn.addEventListener('click', function(){ prepareEditSale(Number(btn.dataset.index)); });
    });
    $all('.delete-sale').forEach(function(btn){
      btn.addEventListener('click', function(){ deleteSale(Number(btn.dataset.index)); });
    });
    $all('.sale-status-select').forEach(function(select){
      select.addEventListener('change', function(){
        updateSaleStatus(Number(select.dataset.index), select.value);
      });
    });
  }

  function prepareEditSale(index){
    var sale = sales[index];
    editingIndex = index;
    $('#saleDate').value = sale.date;
    $('#saleCustomer').value = sale.customer;
    $('#saleStatus').value = sale.status || 'En proceso de compra';
    orderItems = sale.items ? sale.items.slice() : [];
    renderOrderItems();
    $('#saveSale').textContent = 'Actualizar pedido';
  }

  async function deleteSale(index){
    if(!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
    var id = sales[index].id;
    var result = await supabaseClient.from('sales').delete().eq('id', id);
    if(result.error){ alert('No se pudo eliminar el pedido: ' + result.error.message); return; }
    sales.splice(index, 1);
    renderSales();
    if(editingIndex !== null){ resetSaleForm(); }
  }

  async function updateSaleStatus(index, status){
    var id = sales[index].id;
    var result = await supabaseClient.from('sales').update({status: status}).eq('id', id);
    if(result.error){ alert('No se pudo actualizar el estado: ' + result.error.message); renderSales(); return; }
    sales[index].status = status;
  }

  var currentModalSale = null;

  function viewOrderDetails(index){
    var sale = sales[index];
    currentModalSale = sale;
    $('#modalOrderFolio').textContent = formatFolio(sale.folio);
    $('#modalOrderDate').textContent = formatDate(sale.date);
    $('#modalOrderCustomer').textContent = sale.customer;
    $('#modalOrderStatus').textContent = sale.status;
    renderModalOrderItems(sale.items);
    var profit = calculateOrderProfit(sale.items || []);
    $('#modalOrderTotal').textContent = '$' + Number(sale.total).toFixed(2);
    $('#modalOrderProfit').textContent = '$' + profit.toFixed(2);
    document.getElementById('orderModal').classList.remove('hidden');
  }

  function downloadTicket(){
    if(!currentModalSale) return;
    var sale = currentModalSale;
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({unit: 'pt', format: 'a4'});
    var pageWidth = doc.internal.pageSize.getWidth();
    var margin = 48;
    var y = 60;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(8, 42, 102);
    doc.text('PROVEXA', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    y += 16;
    doc.text('Suministros industriales y empresariales', margin, y);
    y += 14;
    doc.text('ventasprovexa@gmail.com  ·  +52 56 11 66 0078', margin, y);

    doc.setDrawColor(220, 229, 241);
    y += 16;
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(8, 42, 102);
    y += 28;
    doc.text('Ticket de venta', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    y += 24;
    doc.text('Folio: ' + formatFolio(sale.folio), margin, y);
    doc.text('Fecha: ' + formatDate(sale.date), pageWidth - margin, y, {align: 'right'});
    y += 16;
    doc.text('Cliente: ' + sale.customer, margin, y);
    y += 16;
    doc.text('Estado: ' + sale.status, margin, y);

    y += 26;
    var col1 = margin, col2 = margin + 240, col3 = margin + 340, col4 = pageWidth - margin;
    doc.setFont('helvetica', 'bold');
    doc.text('Producto', col1, y);
    doc.text('Cantidad', col2, y);
    doc.text('Precio', col3, y);
    doc.text('Subtotal', col4, y, {align: 'right'});
    y += 8;
    doc.setDrawColor(220, 229, 241);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFont('helvetica', 'normal');
    (sale.items || []).forEach(function(item){
      y += 20;
      var subtotal = Number(item.qty) * Number(item.price);
      doc.text(String(item.product), col1, y);
      doc.text(String(item.qty), col2, y);
      doc.text('$' + Number(item.price).toFixed(2), col3, y);
      doc.text('$' + subtotal.toFixed(2), col4, y, {align: 'right'});
    });

    y += 16;
    doc.setDrawColor(220, 229, 241);
    doc.line(margin, y, pageWidth - margin, y);

    y += 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(8, 42, 102);
    doc.text('Total: $' + Number(sale.total).toFixed(2), pageWidth - margin, y, {align: 'right'});

    y += 40;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('Gracias por tu compra en PROVEXA.', margin, y);

    doc.save('ticket-' + formatFolio(sale.folio) + '.pdf');
  }

  function renderModalOrderItems(items){
    var tbody = $('#modalOrderTable tbody'); tbody.innerHTML = '';
    items.forEach(function(item){
      var subtotal = (item.qty * item.price).toFixed(2);
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+item.product+'</td><td>'+item.qty+'</td><td>$'+Number(item.price).toFixed(2)+'</td><td>$'+subtotal+'</td>';
      tbody.appendChild(tr);
    });
  }

  function closeOrderModal(){
    document.getElementById('orderModal').classList.add('hidden');
  }

  function renderOrderItems(){
    var tbody = $('#orderItemTable tbody'); tbody.innerHTML = '';
    orderItems.forEach(function(item, index){
      var subtotal = (item.qty * item.price).toFixed(2);
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+item.product+'</td><td>'+item.qty+'</td><td>$'+Number(item.price).toFixed(2)+'</td>' +
        '<td>$'+subtotal+'</td>' +
        '<td class="action-buttons"><button class="btn ghost small remove-item" data-index="'+index+'">Eliminar</button></td>';
      tbody.appendChild(tr);
    });
    $('#orderTotal').textContent = '$' + calculateOrderTotal(orderItems).toFixed(2);
    bindOrderItemActions();
  }

  function bindOrderItemActions(){
    $all('.remove-item').forEach(function(btn){
      btn.addEventListener('click', function(){ removeOrderItem(Number(btn.dataset.index)); });
    });
  }

  function populateProductSelect(){
    var select = $('#itemProduct');
    var currentValue = select.value;
    select.innerHTML = '<option value="">Selecciona un producto</option>' +
      products.map(function(p){
        return '<option value="'+p.name+'" data-price="'+p.salePrice+'" data-cost="'+p.costPrice+'">'+p.name+' ('+(p.id || 's/id')+')</option>';
      }).join('');
    if(products.some(function(p){ return p.name === currentValue; })){
      select.value = currentValue;
    }
  }

  function fillPriceFromSelectedProduct(){
    var select = $('#itemProduct');
    var option = select.options[select.selectedIndex];
    var price = option ? option.getAttribute('data-price') : null;
    if(price !== null){
      $('#itemPrice').value = price;
    }
  }

  function addOrderItem(){
    var select = $('#itemProduct');
    var product = select.value.trim();
    var qty = Number($('#itemQty').value);
    var price = Number($('#itemPrice').value);
    if(!product || !qty || !price){
      alert('Selecciona el producto, la cantidad y el precio unitario.');
      return;
    }
    var option = select.options[select.selectedIndex];
    var costPrice = option ? Number(option.getAttribute('data-cost')) || 0 : 0;
    orderItems.push({product: product, qty: qty, price: price, costPrice: costPrice});
    $('#itemProduct').value = '';
    $('#itemQty').value = 1;
    $('#itemPrice').value = '';
    renderOrderItems();
  }

  function removeOrderItem(index){
    orderItems.splice(index, 1);
    renderOrderItems();
  }

  function renderProducts(){
    var tbody = $('#productsTable tbody'); tbody.innerHTML = '';
    var filterValue = $('#categoryFilter').value;
    products.forEach(function(p, index){
      if(filterValue && p.category !== filterValue) return;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+(p.id || '—')+'</td><td>'+p.name+'</td><td>'+(p.category || '—')+'</td>' +
        '<td>$'+Number(p.costPrice).toFixed(2)+'</td>' +
        '<td>$'+Number(p.salePrice).toFixed(2)+'</td>' +
        '<td>'+Number(p.stock)+'</td>' +
        '<td class="action-buttons"><button class="btn ghost small edit-product" data-index="'+index+'">Editar</button>' +
        '<button class="btn danger small delete-product" data-index="'+index+'">Borrar</button></td>';
      tbody.appendChild(tr);
    });
    $('#productCount').textContent = products.length;
    bindProductRowActions();
    populateProductSelect();
    populateCategoryOptions();
  }

  function getCategories(){
    var seen = {};
    var categories = [];
    products.forEach(function(p){
      var category = (p.category || '').trim();
      if(category && !seen[category]){ seen[category] = true; categories.push(category); }
    });
    categories.sort();
    return categories;
  }

  function populateCategoryOptions(){
    var categories = getCategories();

    var filterSelect = $('#categoryFilter');
    var currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Todas las categorías</option>' +
      categories.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
    if(categories.indexOf(currentFilter) !== -1){ filterSelect.value = currentFilter; }

    var datalist = $('#categoryOptions');
    datalist.innerHTML = categories.map(function(c){ return '<option value="'+c+'">'; }).join('');
  }

  function bindProductRowActions(){
    $all('.edit-product').forEach(function(btn){
      btn.addEventListener('click', function(){ prepareEditProduct(Number(btn.dataset.index)); });
    });
    $all('.delete-product').forEach(function(btn){
      btn.addEventListener('click', function(){ deleteProduct(Number(btn.dataset.index)); });
    });
  }

  function prepareEditProduct(index){
    var product = products[index];
    editingProductIndex = index;
    $('#productId').value = product.id;
    $('#productName').value = product.name;
    $('#productCategory').value = product.category || '';
    $('#productCost').value = product.costPrice;
    $('#productPrice').value = product.salePrice;
    $('#productStock').value = product.stock;
    $('#addProduct').textContent = 'Actualizar producto';
  }

  async function deleteProduct(index){
    if(!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    var id = products[index].id;
    var result = await supabaseClient.from('products').delete().eq('id', id);
    if(result.error){ alert('No se pudo eliminar el producto: ' + result.error.message); return; }
    products.splice(index, 1);
    renderProducts();
    if(editingProductIndex !== null){ resetProductForm(); }
  }

  async function saveProduct(){
    var id = $('#productId').value.trim();
    var name = $('#productName').value.trim();
    var category = $('#productCategory').value.trim();
    var costPrice = Number($('#productCost').value) || 0;
    var salePrice = Number($('#productPrice').value);
    var stock = Number($('#productStock').value) || 0;

    if(!id || !name || !salePrice){
      alert('Completa al menos el ID, el producto y el precio de venta.');
      return;
    }
    var duplicate = products.some(function(p, index){
      return p.id === id && index !== editingProductIndex;
    });
    if(duplicate){
      alert('Ya existe un producto con ese ID.');
      return;
    }

    var payload = productToDb({id: id, name: name, category: category, costPrice: costPrice, salePrice: salePrice, stock: stock});

    if(editingProductIndex !== null){
      var oldId = products[editingProductIndex].id;
      var result = await supabaseClient.from('products').update(payload).eq('id', oldId).select().single();
      if(result.error){ alert('No se pudo actualizar el producto: ' + result.error.message); return; }
      products[editingProductIndex] = productFromDb(result.data);
    } else {
      var insertResult = await supabaseClient.from('products').insert(payload).select().single();
      if(insertResult.error){ alert('No se pudo guardar el producto: ' + insertResult.error.message); return; }
      products.unshift(productFromDb(insertResult.data));
    }

    renderProducts();
    resetProductForm();
  }

  function resetProductForm(){
    editingProductIndex = null;
    $('#productId').value = '';
    $('#productName').value = '';
    $('#productCategory').value = '';
    $('#productCost').value = '';
    $('#productPrice').value = '';
    $('#productStock').value = '';
    $('#addProduct').textContent = 'Agregar producto';
  }

  async function createSaleFromForm(){
    var date = $('#saleDate').value;
    var customer = $('#saleCustomer').value.trim();
    var status = $('#saleStatus').value;
    var total = calculateOrderTotal(orderItems);

    if(!date || !customer || !status){
      alert('Completa la fecha, el cliente y el estado.');
      return;
    }
    if(!orderItems.length){
      alert('Agrega al menos un artículo al pedido.');
      return;
    }

    var payload = {date: date, customer: customer, items: orderItems.slice(), status: status, total: total};

    if(editingIndex !== null){
      var id = sales[editingIndex].id;
      var updateResult = await supabaseClient.from('sales').update(payload).eq('id', id).select().single();
      if(updateResult.error){ alert('No se pudo actualizar el pedido: ' + updateResult.error.message); return; }
      sales[editingIndex] = saleFromDb(updateResult.data);
      editingIndex = null;
      $('#saveSale').textContent = 'Guardar pedido';
    } else {
      var insertResult = await supabaseClient.from('sales').insert(payload).select().single();
      if(insertResult.error){ alert('No se pudo guardar el pedido: ' + insertResult.error.message); return; }
      sales.unshift(saleFromDb(insertResult.data));
    }

    renderSales();
    resetSaleForm();
  }

  function resetSaleForm(){
    editingIndex = null;
    orderItems = [];
    $('#saleDate').value = new Date().toISOString().slice(0,10);
    $('#saleCustomer').value = '';
    $('#saleStatus').value = 'En proceso de compra';
    $('#itemProduct').value = '';
    $('#itemQty').value = 1;
    $('#itemPrice').value = '';
    renderOrderItems();
    $('#saveSale').textContent = 'Guardar pedido';
  }

  function exportSalesCSV(){
    var rows = [['Folio','Fecha','Cliente','Pedido','Estado','Total','Ganancia']].concat(sales.map(function(s){
      var orderSummary = s.items ? s.items.map(function(item){ return item.product + ' x' + item.qty; }).join(' | ') : '';
      var profit = calculateOrderProfit(s.items || []);
      return [formatFolio(s.folio), formatDate(s.date), s.customer, orderSummary, s.status, s.total, profit.toFixed(2)];
    }));
    var csv = rows.map(r=>r.map(c=>('"'+String(c).replace(/"/g,'""')+'"')).join(',')).join('\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'pedidos.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  async function clearProducts(){
    if(!confirm('¿Vaciar toda la lista de productos? Esta acción no se puede deshacer.')) return;
    var result = await supabaseClient.from('products').delete().not('id', 'is', null);
    if(result.error){ alert('No se pudo vaciar la lista: ' + result.error.message); return; }
    products = [];
    renderProducts();
    resetProductForm();
  }

  function switchPanel(name){
    $all('.admin-section').forEach(function(s){ s.hidden = s.id !== name; });
    $all('.admin-tab').forEach(function(b){ b.classList.toggle('is-active', b.dataset.panel===name); });
  }

  var sessionNicknames = {
    'alejandrorafaelsl1@outlook.com': 'Chalán'
  };

  async function showSessionLabel(){
    var result = await supabaseClient.auth.getSession();
    var email = result.data && result.data.session ? result.data.session.user.email : '';
    var label = sessionNicknames[email] || 'Administrador';
    $('#sessionLabel').textContent = label;
  }

  document.addEventListener('DOMContentLoaded', function(){
    resetSaleForm();
    loadSales();
    loadProducts();
    showSessionLabel();
    $all('.admin-tab').forEach(function(btn){ btn.addEventListener('click', function(){ switchPanel(btn.dataset.panel); }); });
    $('#itemProduct').addEventListener('change', fillPriceFromSelectedProduct);
    $('#addOrderItem').addEventListener('click', function(e){ e.preventDefault(); addOrderItem(); });
    $('#saveSale').addEventListener('click', function(e){ e.preventDefault(); createSaleFromForm(); });
    $('#cancelEditSale').addEventListener('click', function(e){ e.preventDefault(); resetSaleForm(); });
    $('#closeOrderModal').addEventListener('click', function(){ closeOrderModal(); });
    $('#downloadTicket').addEventListener('click', downloadTicket);
    $('#orderModal').addEventListener('click', function(e){ if(e.target.id === 'orderModal') closeOrderModal(); });
    $('#exportSales').addEventListener('click', exportSalesCSV);
    $('#addProduct').addEventListener('click', function(e){ e.preventDefault(); saveProduct(); });
    $('#cancelEditProduct').addEventListener('click', function(e){ e.preventDefault(); resetProductForm(); });
    $('#clearProducts').addEventListener('click', clearProducts);
    $('#categoryFilter').addEventListener('change', renderProducts);
  });
})();
