// Simple admin panel interactions and sample data (client-side only)
(function(){
  var salesKey = 'provexa_sales_v1';
  var productsKey = 'provexa_products_v1';

  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  var defaultSales = [
    {date: new Date().toLocaleDateString('es-ES'), customer: 'ACME S.A.', items:[{product:'Kit de limpieza',qty:3,price:150}], status: 'Entregado y pagado', total: 450},
    {date: new Date().toLocaleDateString('es-ES'), customer: 'Distribuciones MX', items:[{product:'Cables',qty:10,price:120}], status: 'En proceso de entrega', total: 1200}
  ];
  var defaultProducts = ['Escobas','Trapeadores','Tornillos','Tuercas'];

  function load(key, fallback){
    try{ var s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }catch(e){return fallback}
  }
  function save(key, data){ localStorage.setItem(key, JSON.stringify(data)); }

  var sales = load(salesKey, defaultSales.slice());
  var products = load(productsKey, defaultProducts.slice());

  var editingIndex = null;
  var orderItems = [];

  function renderSales(){
    var tbody = $('#salesTable tbody'); tbody.innerHTML = '';
    var total = 0;
    sales.forEach(function(s, index){
      var orderSummary = renderOrderSummary(s.items);
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+s.date+'</td><td>'+s.customer+'</td><td>'+orderSummary+'</td>' +
        '<td><select class="sale-status-select" data-index="'+index+'">'+renderStatusOptions(s.status)+'</select></td>' +
        '<td>$'+s.total.toFixed(2)+'</td>' +
        '<td class="action-buttons"><button class="btn ghost small view-order" data-index="'+index+'">Ver</button>' +
        '<button class="btn ghost small edit-sale" data-index="'+index+'">Editar</button>' +
        '<button class="btn danger small delete-sale" data-index="'+index+'">Borrar</button></td>';
      tbody.appendChild(tr);
      total += Number(s.total)||0;
    });
    var totalText = '$' + total.toFixed(2);
    $('#salesTotal').textContent = totalText;
    $('#salesTotalCard').textContent = totalText;
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
    $('#saleDate').value = new Date(sale.date.split('/').reverse().join('-')).toISOString().slice(0,10);
    $('#saleCustomer').value = sale.customer;
    $('#saleStatus').value = sale.status || 'En proceso de compra';
    orderItems = sale.items ? sale.items.slice() : [];
    renderOrderItems();
    $('#saveSale').textContent = 'Actualizar pedido';
  }

  function deleteSale(index){
    if(!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
    sales.splice(index, 1);
    save(salesKey, sales);
    renderSales();
    if(editingIndex !== null){ resetSaleForm(); }
  }

  function updateSaleStatus(index, status){
    sales[index].status = status;
    save(salesKey, sales);
  }

  function viewOrderDetails(index){
    var sale = sales[index];
    $('#modalOrderDate').textContent = sale.date;
    $('#modalOrderCustomer').textContent = sale.customer;
    $('#modalOrderStatus').textContent = sale.status;
    renderModalOrderItems(sale.items);
    $('#modalOrderTotal').textContent = '$' + Number(sale.total).toFixed(2);
    document.getElementById('orderModal').classList.remove('hidden');
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

  function calculateOrderTotal(items){
    return items.reduce(function(sum, item){
      return sum + (Number(item.qty) * Number(item.price));
    }, 0);
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

  function addOrderItem(){
    var product = $('#itemProduct').value.trim();
    var qty = Number($('#itemQty').value);
    var price = Number($('#itemPrice').value);
    if(!product || !qty || !price){
      alert('Completa el producto, la cantidad y el precio unitario.');
      return;
    }
    orderItems.push({product: product, qty: qty, price: price});
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
    var ul = $('#productList'); ul.innerHTML = '';
    products.forEach(function(p){
      var li = document.createElement('li');
      li.textContent = p;
      ul.appendChild(li);
    });
    $('#productCount').textContent = products.length;
  }

  function addSampleSale(){
    var sampleItems = [
      {product: 'Producto demo', qty: 1, price: Math.round(Math.random()*500+50)}
    ];
    var sampleTotal = calculateOrderTotal(sampleItems);
    var sample = {date: new Date().toLocaleDateString('es-ES'), customer: 'Cliente demo', items: sampleItems, status: 'En proceso de compra', total: sampleTotal};
    sales.unshift(sample); save(salesKey, sales); renderSales();
  }

  function createSaleFromForm(){
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

    var sale = {
      date: new Date(date).toLocaleDateString('es-ES'),
      customer: customer,
      items: orderItems.slice(),
      status: status,
      total: total
    };

    if(editingIndex !== null){
      sales[editingIndex] = sale;
      editingIndex = null;
      $('#saveSale').textContent = 'Guardar pedido';
    } else {
      sales.unshift(sale);
    }

    save(salesKey, sales);
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
    var rows = [['Fecha','Cliente','Pedido','Estado','Total']].concat(sales.map(function(s){
      var orderSummary = s.items ? s.items.map(function(item){ return item.product + ' x' + item.qty; }).join(' | ') : '';
      return [s.date, s.customer, orderSummary, s.status, s.total];
    }));
    var csv = rows.map(r=>r.map(c=>('"'+String(c).replace(/"/g,'""')+'"')).join(',')).join('\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'pedidos.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function addSampleProduct(){ products.unshift('Producto ' + Math.floor(Math.random()*900+100)); save(productsKey, products); renderProducts(); }
  function clearProducts(){ products = []; save(productsKey, products); renderProducts(); }

  function switchPanel(name){
    $all('.admin-section').forEach(function(s){ s.hidden = s.id !== name; });
    $all('.admin-tab').forEach(function(b){ b.classList.toggle('is-active', b.dataset.panel===name); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderSales(); renderProducts();
    resetSaleForm();
    $all('.admin-tab').forEach(function(btn){ btn.addEventListener('click', function(){ switchPanel(btn.dataset.panel); }); });
    $('#addSampleSale').addEventListener('click', addSampleSale);
    $('#addOrderItem').addEventListener('click', function(e){ e.preventDefault(); addOrderItem(); });
    $('#saveSale').addEventListener('click', createSaleFromForm);
    $('#cancelEditSale').addEventListener('click', function(e){ e.preventDefault(); resetSaleForm(); });
    $('#closeOrderModal').addEventListener('click', function(){ closeOrderModal(); });
    $('#orderModal').addEventListener('click', function(e){ if(e.target.id === 'orderModal') closeOrderModal(); });
    $('#exportSales').addEventListener('click', exportSalesCSV);
    $('#addSampleProduct').addEventListener('click', addSampleProduct);
    $('#clearProducts').addEventListener('click', clearProducts);
  });
})();
