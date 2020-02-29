;(function(){
    function carousel (options) {
        $.extend(this, {
            index: 0,
            size: 0,
            width: 0
        }, options);
    }
    $.extend(carousel.prototype,{
        bindHandlerEvent: function() {
            var self = this;
            
            this.prev_btn.off('click');
            this.prev_btn.on('click', function() {
                self.prev();
            });

            this.next_btn.off('click');
            this.next_btn.on('click', function() {
                self.next();
            });
        },
        init: function(index) {
            this.index = index? index: 0;
            this.curPage && this.curPage.text(this.index + 1);

            this.page_container.animate({
                'margin-left': 0 - (this.index * this.width)
            }, 400);

            this.bindHandlerEvent();
            this.setHandlerCss();
            this.updateBgImage && this.updateBgImage();
            this.updateBgText && this.updateBgText();
        },
        reset: function(param) {
            var index = param.index ? param.index : 0;
            this.size = param.size ? param.size : this.size;
            this.width = param.width ? param.width : this.width;
            
            this.init(index);
        },
        next: function() {
            this.increase();
            this.page_container.animate({
                'margin-left': -(this.width * this.index)
            }, 400);
            this.setHandlerCss();
            this.updateBgImage && this.updateBgImage();
            this.updateBgText && this.updateBgText();
        },
        prev: function() {
            this.decrease();
            this.page_container.animate({
                'margin-left': -(this.width * this.index)
            }, 400);
            this.setHandlerCss();
            this.updateBgImage && this.updateBgImage();
            this.updateBgText && this.updateBgText();
        },
        increase: function() {
            if(this.isOnly()) {
                this.index = 0;
                return;
            }
            this.index += 1;
            if(this.index + 1 >= this.size) {
                this.index = this.size - 1;
            }
            this.curPage && this.curPage.text(this.index + 1);
        },
        decrease: function() {
            if(this.isOnly()) {
                this.index =0;
                return;
            }
            this.index -= 1;

            if(this.index < 0) {
                this.index = 0;
            }
            this.curPage && this.curPage.text(this.index + 1);
        },
        setHandlerCss: function () {
            this.updateHandlers && this.updateHandlers(true, false);
            if(this.isOnly()){
                this.prev_btn.removeClass('active');
                this.next_btn.removeClass('active');
                return;
            }

            if(this.isFirst()) {
                this.prev_btn.removeClass('active');
                this.next_btn.addClass('active');
                this.updateHandlers && this.updateHandlers(true, false);
                return;
            }

            if(this.isLast()) {
                this.prev_btn.addClass('active');
                this.next_btn.removeClass('active');
                this.updateHandlers && this.updateHandlers(false, true);
                return;
            }

            this.prev_btn.addClass('active');
            this.next_btn.addClass('active');
        },
        isOnly: function() {
            return this.size === 1;
        },
        isFirst: function() {
            return this.index === 0;
        },
        isLast: function() {
            return this.index + 1 === this.size;
        }
    })
    window.carousel = carousel;
})();