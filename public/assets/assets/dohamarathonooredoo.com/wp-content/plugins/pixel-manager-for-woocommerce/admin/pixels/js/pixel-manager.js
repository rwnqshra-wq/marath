window.dataLayer = window.dataLayer || [];
class PMW_PixelManagerJS {
  constructor(options = {}, is_Bindings = true, is_woocomerce = true){    
    this.options = {
      esc_tracking: true
    };
    if(options){
      Object.assign(this.options, options);
    }
    if(is_woocomerce){
      this.PixelManagerDataLayer = PixelManagerDataLayer[0]["data"];
      this.PMWEventID = PixelManagerEventOptions.time;
      this.PixelManagerOptions = PixelManagerOptions;
      this.TrackFormSubmissionsBindings();    

      this.LineItemReq = {    
        item_id       : 'item_id',
        item_name     : 'item_name',
        item_category : 'item_category',
        index         : 'index',
        item_brand    : 'item_brand',
        item_variant  : 'item_variant',
        price         : 'price',
        //currency      : "currency",
        //quantity      : 'quantity',
        item_list_name: 'item_list_name'
      };
      this.is_begin_checkout_fired = false;
      this.is_shipping_fired = false;
      this.TrackGoogleAdsConversionFormSubmissionsBindings();
    }else{
      this.PixelManagerOptions = PixelManagerOptions;
      this.TrackFormSubmissionsBindings();
      this.TrackGoogleAdsConversionFormSubmissionsBindings();
    }
    
    /*var variations = jQuery('.variations_form').data( 'product_variations' );
    var variation = this.get_item_form_items_by_key_val(variations, 'variation_id', 132);*/
  }
  TrackFormSubmissionsBindings(){
    if(this.PixelManagerOptions.hasOwnProperty('generate_lead_from') && this.PixelManagerOptions.generate_lead_from != ""){
      let generate_lead_from = this.PixelManagerOptions.generate_lead_from;
      generate_lead_from = generate_lead_from.replace(/,([^ ])/g, ', $1');     
      //var selector_elements = generate_lead_from.split(', ').map(selector => selector.trim());      
      var elements  = document.querySelectorAll(generate_lead_from);
      if(elements.length > 0){ 
        for (var i = 0; i < elements.length; i++) {
          if(elements[i]){
            elements[i].addEventListener("submit", () => this.TrackFormSubmissions(event));
          }
        }
      }
    }
  }

  TrackGoogleAdsConversionFormSubmissionsBindings() {
    const options = this.PixelManagerOptions;

    // Validate required fields for Google Ads form conversion tracking
    const isEnabled = options.google_ads_form_conversion?.is_enable;
    const conversionId = options.google_ads_form_conversion?.id;
    const conversionLabel = options.google_ads_form_conversion?.label;
    const selector = options.google_ads_form_conversion?.selector;

    // Only proceed if tracking is enabled and all required fields are present
    if (isEnabled && conversionId && conversionLabel && selector) {
      // Clean up selector string
      let formSelectors = selector.replace(/,([^ ])/g, ', $1');
      const elements = document.querySelectorAll(formSelectors);

      if (elements.length > 0) {
        elements.forEach(form => {
          if (form) {
            form.addEventListener("submit", (event) => this.TrackFormSubmissionsGoogleAds(event));
          }
        });
      }
    }
  }
  TrackFormSubmissionsGoogleAds(event){
    event.preventDefault();
    var this_var =  event.currentTarget;
    // prevent infinite loop on programmatic submit
    if (this_var && this_var.dataset && this_var.dataset.pmwSubmitted === '1') {
      return;
    }
    var form_name = this_var.getAttribute('aria-label') || this_var.getAttribute('name') || this_var.getAttribute('id');
    var form_id = this_var.getAttribute('id');
    var action_url = this_var.getAttribute('action');
    var page_url = window.location.href;
    var page_title = document.title;
    var PMWEvent = {
        event: "form_conversion",
        conversion_type: "lead_form_submission",
        page_title : page_title,
        form_id: (form_id)?form_id:"",
        form_name: (form_name)?form_name:"",
        action_url: (action_url)?action_url:"",
        page_url: page_url
      };
      dataLayer.push(PMWEvent);
  }

  TrackFormSubmissions(event){
    event.preventDefault();
    var this_var =  event.currentTarget;
    // prevent infinite loop on programmatic submit
    if (this_var && this_var.dataset && this_var.dataset.pmwSubmitted === '1') {
      return;
    }
    var form_name = this_var.getAttribute('aria-label') || this_var.getAttribute('name') || this_var.getAttribute('id');
    var form_id = this_var.getAttribute('id');
    var action_url = this_var.getAttribute('action');
    var page_url = window.location.href;
    var page_title = document.title;
    var PMWEvent = {
        event: "form_submit",
        page_title : page_title,
        form_id: (form_id)?form_id:"",
        form_name: (form_name)?form_name:"",
        action_url: (action_url)?action_url:"",
        page_url: page_url
      };
      dataLayer.push(PMWEvent);
      // continue with normal form submission
      if (this_var) {
        this_var.dataset.pmwSubmitted = '1';
        this_var.submit();
      }
  }

  Purchase(){
    if(this.PixelManagerDataLayer.hasOwnProperty('checkout') && this.PixelManagerDataLayer.checkout.hasOwnProperty('cart_product_list')){
      this.LineItemReq["quantity"]="quantity";
      var Items = this.GetLineItems(this.PixelManagerDataLayer.checkout.cart_product_list, this.LineItemReq);
      var PMWEvent = {
        event: "purchase",
        ecommerce: {
          transaction_id: this.PixelManagerDataLayer.checkout.id,
          currency: this.PixelManagerDataLayer.currency,
          value: this.PixelManagerDataLayer.checkout.total,
          tax: this.PixelManagerDataLayer.checkout.tax,
          shipping: this.PixelManagerDataLayer.checkout.shipping,
          coupon: this.PixelManagerDataLayer.checkout.coupon,
          items: Items
        }
      };
      dataLayer.push(PMWEvent);
    }
  }

  TrackPurchase() {
    if (!this.PixelManagerDataLayer?.checkout?.cart_product_list) {
      return;
    }

    const { id: order_id, cart_product_list: items, total } = this.PixelManagerDataLayer.checkout;
    const { currency } = this.PixelManagerDataLayer;
    const itemsArray = Object.values(items);

    // Prepare platforms data
    const platformsData = {
      facebook: this.PixelManagerOptions.fb_conversion_api?.is_enable || false,
      tiktok: this.PixelManagerOptions.tiktok_conversion_api?.is_enable || false,
      pinterest: this.PixelManagerOptions.pinterest_conversion_api?.is_enable || false,
      //twitter: this.PixelManagerOptions.twitter_conversion_api?.is_enable || false,
      //snapchat: this.PixelManagerOptions.snapchat_conversion_api?.is_enable || false
    };

    // Prepare common data
    const eventData = {
      event_id: this.PMWEventID,
      event_source_url: window.location.href,
      order_id,
      currency,
      total,
      items: JSON.stringify(itemsArray.map(item => ({
        id: item.id,
        name: item.item_name,
        price: item.price,
        quantity: item.quantity,
        category: item.category?.[0]
      }))),
      platforms: JSON.stringify(platformsData) // Stringify the platforms object
    };

    // Only proceed if any platform is enabled
    if (!Object.values(platformsData).some(Boolean)) {
      return;
    }

    // Single AJAX call for all platforms
    jQuery.ajax({
      type: 'POST',
      url: pmw_f_ajax_url,
      data: {
          action: 'pmw_process_conversion_events',
          nonce: (typeof pmw_conversion_nonce !== 'undefined') ? pmw_conversion_nonce : '',
          ...eventData
      },
      success: (response) => {
        if(this.PixelManagerOptions?.integration?.conversion_api_browser_debug){
          console.log('Conversion events processed:', response);
        }
      },
      error: (xhr, status, error) => {
        if(this.PixelManagerOptions?.integration?.conversion_api_browser_debug){
          console.error('Error processing conversions:', error);
        }
      }
    });
  }
  
  IsEmpty(List){
    if(List != undefined && Object.keys(List).length > 0 ){
      return false;
    }
    return true;
  }
  ConvertArrayToString(value){
    if(Object.keys(value).length > 0){
      return value.join(", ");
    }else{
      return value;
    }
  }
  GetProductFromProductList(product_id){    
     if(this.PixelManagerDataLayer.hasOwnProperty('product_list') && product_id != ""){
      var ProductList = this.PixelManagerDataLayer.product_list;
      if(!this.IsEmpty(ProductList) ){        
        for(var dataLayer_item in ProductList){
          if(ProductList[dataLayer_item].hasOwnProperty('id')){
            var id = ProductList[dataLayer_item].id;
            if(product_id == id){
              return ProductList[dataLayer_item];
            }
          }
        }
      }
    }
  }
  GetProductFromCartProductList(product_id){
    if(this.PixelManagerDataLayer.hasOwnProperty('checkout') && this.PixelManagerDataLayer.checkout.hasOwnProperty('cart_product_list')){
      var ProductList = this.PixelManagerDataLayer.checkout.cart_product_list;
      if(!this.IsEmpty(ProductList) ){        
        for(var dataLayer_item in ProductList){
          if(ProductList[dataLayer_item].hasOwnProperty('id')){
            var id = ProductList[dataLayer_item].id;
            if(product_id == id){
              return ProductList[dataLayer_item];
            }
          }
        }
      }
    }
  }
  /*get_variation_data(obj){
    var p_v_title = "";
    var variation_data = [];
    if(Object.keys(obj).length >0 ){
      for(var dataLayer_item in obj) {
        if(obj[dataLayer_item].hasOwnProperty("attributes")){
          for(var p_attributes in obj[dataLayer_item]) {
            if(obj[dataLayer_item].hasOwnProperty(p_attributes)){
              p_v_title+=(p_v_title=="")?p_attributes[index]:' | '+p_attributes[index]; 
            }      
          }
          variation_data.push(p_v_title);
        }      
      }
      return variation_data;
    }
  }
  get_item_form_items_by_key_val(obj, key, val){
    if(val != ""){
      if(Object.keys(obj).length >0 ){
        for(var dataLayer_item in obj){
          if(obj[dataLayer_item].hasOwnProperty(key)){
            var map_val = obj[dataLayer_item][key]; 
            if(val == map_val){
              return obj[dataLayer_item];
            }
          }
        }
      }
    }
  }*/

  GetProductFromProductListByURL(prod_obj, key, product_url){
    if(this.IsEmpty(prod_obj)){
      return [];
    }
    if(product_url != ""){      
      for(var dataLayer_item in prod_obj){
        if(prod_obj[dataLayer_item].hasOwnProperty(key)){
          var map_val = prod_obj[dataLayer_item][key]; 
          if(product_url == map_val){
            return prod_obj[dataLayer_item];
          }
        }
      }      
    }
  }
  GetLineItems( ProductList, LineItemReq, PixelName = null ){
    if(this.IsEmpty(ProductList)){
      return [];
    }
    var this_var = this;
    var ProductItems = [];
    if(Object.keys(ProductList).length > 0){
      Object.keys(ProductList).forEach(function(KeyVal, index){        
        if(ProductList.hasOwnProperty(KeyVal)){
          var Item = ProductList[KeyVal];
          var NewItem = this_var.GetLineItem(Item, LineItemReq, PixelName);
          if(Object.keys(NewItem).length > 0){
            ProductItems.push( NewItem );
          }
        }        
      });      
    }
    return ProductItems;
  }
  GetLineItem( Product, LineItemReq, PixelName = null){
    if(this.IsEmpty(Product)){
      return [];
    }
    var ProductItem = {};
    if(Object.keys(LineItemReq).length > 0){
      Object.keys(LineItemReq).forEach(function(KeyVal, index){
        var ItemKey = LineItemReq[KeyVal];
        if(Product.hasOwnProperty(ItemKey)){
          if(KeyVal == "item_category"){
            Object.keys(Product[ItemKey]).forEach(function(c_KeyVal, c_index){
              if(c_KeyVal == 0 ){
                ProductItem[KeyVal] = Product[ItemKey][c_index];
              }else{
                ProductItem[KeyVal+(c_index+1)] = Product[ItemKey][c_index];
              }
            });
          }else if(Product[ItemKey] != '' && Product[ItemKey] != null && Product[ItemKey] != 'undefined' ){
            ProductItem[KeyVal] = Product[ItemKey];
          }
        }
      });
      /*if(PixelName == "Tiktok"){
        ProductItem['currency'] = DataLayer.currency;
      }*/
    }
    return ProductItem;    
  }
  getParameterByName(name, url = window.location.href){
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
  isFacebookConversionAPIEnable(){
    if(this.PixelManagerOptions.hasOwnProperty("fb_conversion_api") && this.PixelManagerOptions.fb_conversion_api.is_enable){
      return true;
    }else{
      return false;
    }
  }
  isGA4Enable(){
    if(this.PixelManagerOptions.hasOwnProperty("google_analytics_4_pixel") && this.PixelManagerOptions.google_analytics_4_pixel.is_enable ){
      return true;
    }else{
      return false;
    }
  }
  isTikTokConversionAPIEnable(){
    if(this.PixelManagerOptions.hasOwnProperty("tiktok_conversion_api") && this.PixelManagerOptions.tiktok_conversion_api.is_enable){
      return true;
    }else{
      return false;
    }
  }
}