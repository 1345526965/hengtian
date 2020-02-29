/**
 * UED
 * 
 */
var $body = $(document.body);

// Sequence script
(function() {
    function Sequence(sequence) {
        this.tasks = sequence || [];
    }

    function launch(instance) {
        if (instance.running) {
            return instance;
        }

        if (!instance.tasks) {
            return instance;
        }
        if (!instance.tasks[instance.current]) {
            return instance;
        }

        instance.running = true;

        var task = instance.tasks[instance.current].task;
        var wait = instance.tasks[instance.current].wait;

        if (!(+wait === wait)) {
            wait = 0;
        }

        if (typeof task == 'function') {
            instance.timeout = setTimeout(function() {
                instance.running = false;
                task(instance.current);
                next(instance);
            }, wait);
        } else {
            instance.timeout = setTimeout(function() {
                instance.running = false;
                next(instance);
            }, wait);
        }

        return instance;
    }

    function next(instance) {
        if (instance.tasks[instance.current + 1]) {
            instance.current++;
            return instance.run();
        }

        if (!instance.tasks[instance.current + 1] && instance.repeating) {
            instance.reset();
            return instance.run();
        }

        return instance.stop();
    }

    Sequence.prototype = {
        tasks: [],
        current: 0,
        repeating: false,

        running: false,
        timeout: null,

        run: function() {
            return launch(this);
        },
        stop: function() {
            clearTimeout(this.timeout);

            this.timeout = null;
            this.running = false;

            return this;
        },
        reset: function(customReset) {
            this.stop();
            this.current = 0;

            if (typeof customReset == 'function') {
                customReset(this);
            }

            return this;
        }
    };

    window.Sequence = Sequence;
})();

// swipe gallery
(function() {
    $.fn.swipeGallery = function(options) {
        options = $.extend({
            slidesHolder: '',
            onResize: null,
            onChange: null
        }, options);

        function getTouches(event) {
            var touches = {
                x: 0,
                y: 0
            };

            if (event && event.changedTouches && event.changedTouches.length) {
                touches.x = event.changedTouches[0].pageX || 0;
                touches.y = event.changedTouches[0].pageY || 0;
            }

            return touches;
        }

        function getPrefixedCSS(property, value) {
            var prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
            var prefix;
            var css = {};

            for (prefix in prefixes) {
                prefix = prefixes[prefix] + property;
                css[prefix] = value;
            }

            return css;
        }

        function onTouchStart(instance, event) {
            instance.touched = true;
            instance.started = false;

            instance.startPoint = getTouches(event);
            instance.currentPoint = instance.startPoint;

            instance.moveFromX = instance.$slidesHolder.css('left') || '0';
            instance.moveFromX = instance.moveFromX.replace(/[^\d\.\-]/g, '');
            instance.moveFromX = (+instance.moveFromX) || 0;

            instance.moveFromY = instance.$slidesHolder.css('top') || '0';
            instance.moveFromY = instance.moveFromY.replace(/[^\d\.\-]/g, '');
            instance.moveFromY = (+instance.moveFromY) || 0;

            instance.$slidesHolder.css(getPrefixedCSS('transition-duration', '0s'));
        }

        function onTouchMove(instance, event) {
            instance.currentPoint = getTouches(event);

            if (instance.touched && !instance.started) {
                instance.moveByX = Math.abs(instance.currentPoint.x - instance.startPoint.x);
                instance.moveByY = Math.abs(instance.currentPoint.y - instance.startPoint.y);

                if (instance.moveByX > instance.moveByY + 6) {
                    if (event) {
                        event.preventDefault();
                    }

                    instance.started = true;
                    instance.startPoint = getTouches(event);
                    instance.currentPoint = instance.startPoint;
                }
            }

            if (instance.started) {
                if (event) {
                    event.preventDefault();
                }

                instance.moveByX = instance.currentPoint.x - instance.startPoint.x;
                instance.$slidesHolder.css('left', instance.moveFromX + instance.moveByX);
            }
        }

        function onTouchEnd(instance, event) {
            if (event) {
                event.preventDefault();
            }

            if (instance.touched && instance.started) {
                instance.$slidesHolder.css(getPrefixedCSS('transition-duration', '.25s'));

                if (instance.moveByX < 0 && instance.curSlide < instance.maxSlide) {
                    instance.curSlide++;
                }

                if (instance.moveByX > 0 && instance.curSlide > 0) {
                    instance.curSlide--;
                }

                if (instance.curSlide != instance.prevSlide) {
                    if (typeof options.onChange == 'function') {
                        options.onChange(instance);
                    }
                }

                instance.prevSlide = instance.curSlide;

                instance.$slidesHolder.css('left', -(instance.curSlide * 100) + '%');
            }

            instance.touched = false;
            instance.started = false;
        }

        this.each(function() {
            var instance = {
                $slidesHolder: null,
                started: false,
                touched: false,
                currentPoint: 0,
                startPoint: 0,
                moveFromX: 0,
                moveFromY: 0,
                moveByX: 0,
                moveByY: 0,
                prevSlide: 0,
                curSlide: 0,
                maxSlide: 0
            };

            instance.$slidesHolder = $(this).find(options.slidesHolder);
            instance.$slidesHolder.css('left', 0);

            instance.maxSlide = instance.$slidesHolder.children().length;
            instance.maxSlide = instance.maxSlide > 0 ? instance.maxSlide - 1 : 0;

            if (typeof options.onResize == 'function') {
                $(window).resize(function() {
                    options.onResize(instance);

                    if (instance.curSlide >= instance.maxSlide) {
                        instance.curSlide = instance.maxSlide - 1;
                        onTouchEnd(instance);
                    }
                });
                options.onResize(instance);
            }

            this.addEventListener('touchcancel', function(event) {
                onTouchEnd(instance, event)
            });
            this.addEventListener('touchstart', function(event) {
                onTouchStart(instance, event)
            });
            this.addEventListener('touchmove', function(event) {
                onTouchMove(instance, event)
            });
            this.addEventListener('touchend', function(event) {
                onTouchEnd(instance, event)
            });
        });
        return this;
    };
})();

// scroll controls
(function() {
    function goto(from, to, instance) {

        instance.running = false;
        clearTimeout(instance.timeout);

        if (!instance.running) {

            instance.running = true;
            instance.canEnter = false;

            instance.previous = from < 0 ? 0 : from;
            instance.current = to < 0 ? 0 : to;


            var count = instance.actionsList.length - 1;
            instance.previous = from > count ? count : from;
            instance.current = to > count ? count : to;


            if (instance.actionsList[instance.current]) {
                if (instance.actionsList[instance.previous]) {
                    instance.actionsList[instance.previous].exitAction(instance.previous, instance.current);
                }

                instance.canEnter = true;
            }

            if (instance.canEnter) {
                if (instance.actionsList[instance.current].enterAction) {
                    instance.actionsList[instance.current].enterAction(instance.previous, instance.current);
                }
                instance.timeout = setTimeout(function() {
                    instance.running = false;

                    instance.actionsList[instance.current].afterAction(instance.previous, instance.current);
                }, instance.actionsList[instance.current].length || 0);
            } else {
                instance.running = false;
            }
        }
    }

    function next(instance) {
        if (instance.current < instance.actionsList.length) {
            goto(instance.current, instance.current + 1, instance);
        }
    }

    function prev(instance) {
        if (instance.current > 0) {
            goto(instance.current, instance.current - 1, instance);
        }
    }

    var Action = function() {};

    Action.prototype = {
        enterAction: null,
        exitAction: null,
        afterAction: null,
        length: 0
    };

    function Actions() {
        var instance = this;
        instance.actionsList = [];
        instance.initied = false;
        instance.running = false;
        instance.canEnter = false;
        instance.current = 0;
        instance.previous = -1;
        instance.timeout = null;
    }

    Actions.prototype = {
        add: function(action) {
            if (action && action instanceof Action) {
                action.enterAction = action.enterAction || function() {};
                action.exitAction = action.exitAction || function() {};
                action.afterAction = action.afterAction || function() {};

                this.actionsList.push(action);
            }
        },
        goto: function(index) {
            goto(this.current, index, this);
        },
        next: function() {
            next(this);
        },
        prev: function() {
            prev(this);
        }
    };

    window.Action = Action;
    window.Actions = Actions;
})();

// Image preloader
(function() {
    var ImagesPreloader = {
        addURL: function(url) {
            addURL(url);
            return this;
        },
        addURLs: function(urls) {
            if (typeof urls == 'object' && urls.length) {
                for (var i = 0, l = urls.length; i < l; i++) {
                    addURL(urls[i]);
                }
            }
            return this;
        },
        start: function() {
            start();
        },
        onUpdate: null,
        onFinish: null,
        onError: null
    };

    var tasks = [];
    var current = 0;
    var image;

    function addURL(url) {
        if ('' + url === url && tasks.indexOf(url) == -1) {
            tasks.push(url);
        }
    }

    function onLoad() {
        if (typeof ImagesPreloader.onUpdate == 'function') {
            ImagesPreloader.onUpdate(current, tasks.length);
        }
        download();
    }

    function onError() {
        if (typeof ImagesPreloader.onError == 'function') {
            ImagesPreloader.onError(tasks[current]);
        }
        download();
    }

    function onFinish() {
        if (typeof ImagesPreloader.onFinish == 'function') {
            ImagesPreloader.onFinish();
        }
    }

    function download() {
        if (current < tasks.length) {
            image = new Image();
            image.src = tasks[current++];
            image.addEventListener('load', onLoad, false);
            image.addEventListener('error', onLoad, false);
        } else {
            onFinish();
        }
    }

    function start() {
        delete ImagesPreloader.addURL;
        delete ImagesPreloader.addURLs;
        delete ImagesPreloader.start;

        download();
    }

    window.ImagesPreloader = ImagesPreloader;
})();

// force preload
(function() {
    ImagesPreloader.addURLs([]);
    if (Device.isTouchscreen && Device.isMobile) {
        var finishCallback = function() {
            $('#loading').fadeOut(0, initmobileAnimations);
            $body.css({
                overflow: 'visible'
            });
        };
    } else {
        var finishCallback = function() {
            $('#loading').fadeOut(0, initHomeAnimations);

        };
    }
    ImagesPreloader.onFinish = finishCallback;
    ImagesPreloader.start();
})();


// init sidenav toggle
(function() {
    $('#sidenav').on('mousemove', function(event){
        event.preventDefault();
        event.stopPropagation();
    })
    $('.sidenav_toggle').click(function() {
        $('#sidenav').removeClass('sidenav-hidden').addClass('sidenav-visiable');
    });

    $('#sidenav_close').click(function() {
         $('#sidenav').removeClass('sidenav-visiable').addClass('sidenav-hidden');
    });
})();

//work
$(function() {
    var opuscarousel = new carousel({
        width: $("#carousel li").width(),
        size:  $("#carousel ul li").size(),
        prev_btn: $('.carousel-controls .previous'),
        next_btn: $('.carousel-controls .next'),
        detail_btn: $('.carousel-controls .details'),
        page_container: $("#carousel ul"),
        curPage:$("#miniUI_slide_anims .cur-page")
    });
    opuscarousel.updateHandlers = function(next_status, detail_status) {
        !!next_status && this.next_btn.show();
        !next_status && this.next_btn.hide();

        !!detail_status && this.detail_btn.show();
        !detail_status && this.detail_btn.hide();
    }
    opuscarousel.updateBgImage = function() {
        var img = $("#carousel li").eq(this.index).find('img');
        var url = 'url(' + img.attr('src') + ')';
        $('#miniUI_slide_anims .page-bg-part').css({
            'background-image': url
        });
    }
    opuscarousel.updateBgText = function() {
        var textArr = [
            {
                top_text: 'Screen',
                bottom_text: 'Techbank',
                bottom_info: ''
            },
            {
                top_text: 'Wechat-Subscription',
                bottom_text: 'Citic',
                bottom_info: ''
            },
            {
                top_text: 'Web',
                bottom_text: 'Cfets',
                bottom_info: '(China Foreign Exchange Trade System)'
            },
            {
                top_text: 'APP',
                bottom_text: 'Tike',
                bottom_info: ''
            }
        ];
        var curText = textArr[this.index];
        $('#miniUI_slide_anims .top-small').text(curText.top_text);
        $('#miniUI_slide_anims .bottom-large').text(curText.bottom_text);
        $('#miniUI_slide_anims .bottom-small').text(curText.bottom_info);
    }
    opuscarousel.init();
    window.opuscarousel = opuscarousel;

    $('#miniUI_slide_anims').parallax();

    $('#miniUI_slide_anims .details').click(function() {
        $('#work_detail').removeClass('work_detail_hidden');
    });
});

// work-detail
(function() {
    var $cover_container = $('#work_detail .cover ul'),
        $pages = $cover_container.find('li'),
        $detail_cover = $('#work_detail .cover');
    var isFirst = true;
    //menu
    (function() {
        var $parent_menus = $('#work_detail .menu.parent > .menu-item');
        var $child_menus = $('#work_detail .menu .menu.child .menu-item');

        var detailImgs = {
            'graphic_design': [
                [
                    [{
                        title: 'Xuegong VI design',
                        url :'./imgs/work_detail/Graphic_Design/01.Xuegong-VI-design+色号72adf7.png',
                        thumbnail: './imgs/work_detail/Graphic_Design/01.Xuegong-VI-design_thumbnail.png',
                        color: '#72adf7'
                    },
                    {
                        title: 'China brand development alliance',
                        url :'./imgs/work_detail/Graphic_Design/03.China-brand-development-alliance-+色号ffffff.png',
                        thumbnail: './imgs/work_detail/Graphic_Design/03.China-brand-development-alliance_thumbnail.png',
                        color: '#ffffff'
                    }],
                    [{
                        title: 'Recruitment',
                        url :'./imgs/work_detail/Graphic_Design/04.Recruitment+色号00adef.png',
                        thumbnail: './imgs/work_detail/Graphic_Design/04.Recruitment_thumbnail.png',
                        color: '#00adef'
                    },
                    {
                        title: 'Flyer',
                        url :'./imgs/work_detail/Graphic_Design/05.Flyer+色号ffffff.png',
                        thumbnail: './imgs/work_detail/Graphic_Design/05.Flyer_thumbnail.png',
                        color: '#ffffff'
                    },
                    {
                        title: 'Poster',
                        url :'./imgs/work_detail/Graphic_Design/06.Poster+色号ff901a.png',
                        thumbnail: './imgs/work_detail/Graphic_Design/06.Poster_thumbnail.png',
                        color: '#ff901a'
                    }]
                ]
            ],
            'dashboard': [
                [
                    [{
                        title: 'A large listed pharmaceutical group',
                        url :'./imgs/work_detail/Dashboard/01.A-large-listed-pharmaceutical-group--+--色号02edb0.jpg',
                        thumbnail: './imgs/work_detail/Dashboard/01.A-large-listed-pharmaceutical-group_thumbnail.jpg',
                        color: '#02edb0'
                    },
                    {
                        title: 'Hongda logistics',
                        url :'./imgs/work_detail/Dashboard/02.Hongda-logistics+色号f76a3c.jpg',
                        thumbnail: './imgs/work_detail/Dashboard/02.Hongda-logistics_thumbnail.jpg',
                        color: '#f76a3c'
                    },
                    {
                        title: 'Railway (official-website)',
                        url :'./imgs/work_detail/Dashboard/03.Railway-(official-website)+色号409efe.png',
                        thumbnail: './imgs/work_detail/Dashboard/03.Railway-(official-website)_thumbnail.png',
                        color: '#409efe'
                    }],
                    [{
                        title: 'Shangshi trade service management platform',
                        url :'./imgs/work_detail/Dashboard/05.Shangshi-trade-service-management-platform+色号4b5fc2.jpg',
                        thumbnail: './imgs/work_detail/Dashboard/05.Shangshi-trade-service-management-platform_thumbnail.jpg',
                        color: '#4b5fc2'
                    }]
                ]
            ],
            'web': [
                [
                    [{
                        title: 'Charity system of a large listed group',
                        url :'./imgs/work_detail/Web/02.Charity-system-of-a-large-listed-group--+--色号ec1c1a.png',
                        thumbnail: './imgs/work_detail/Web/02.Charity-system-of-a-large-listed-group_thumbnail.png',
                        color: '#ec1c1a'
                    },
                    {
                        title: 'The official website of a financial listed group',
                        url :'./imgs/work_detail/Web/03.The-official-website-of-a-financial-listed-group--+--色号2158f8.png',
                        thumbnail: './imgs/work_detail/Web/03.The-official-website-of-a-financial-listed-group_thumbnail.png',
                        color: '#2158f8'
                    },
                    {
                        title: 'Honda motorcycle',
                        url :'./imgs/work_detail/Web/04.Honda-motorcycle澳洲官网+色号e61e2f.png',
                        thumbnail: './imgs/work_detail/Web/04.Honda-motorcycle_thumbnail.png',
                        color: '#e61e2f'
                    }],
                    [{
                        title: 'CFETS online education platform',
                        url :'./imgs/work_detail/Web/05.CFETS-online-education-platform+色号3372dd.png',
                        thumbnail: './imgs/work_detail/Web/05.CFETS-online-education-platform_thumbnail.png',
                        color: '#3372dd'
                    },
                    {
                        title: 'Xuegong official website',
                        url :'./imgs/work_detail/Web/06.Xuegong-official-website+色号027df7.png',
                        thumbnail: './imgs/work_detail/Web/06.Xuegong-official-website_thumbnail.png',
                        color: '#027df7'
                    },
                    {
                        title: 'Anyi finance official website',
                        url :'./imgs/work_detail/Web/07.Anyi-finance-official-website+色号dc993f.png',
                        thumbnail: './imgs/work_detail/Web/07.Anyi-finance-official-website_thumbnail.png',
                        color: '#dc993f'
                    }]
                ]
            ],
            'life_style': [
                [
                    [{
                        title: 'RUYIXING (official-website)',
                        url :'./imgs/work_detail/APP/Lifestyle/03.RUYIXING(official-website)+色号338867.png',
                        thumbnail :'./imgs/work_detail/APP/Lifestyle/03.RUYIXING(official-website)_thumbnail.png',
                        color: '#338867'
                    },
                    {
                        title: 'Wangdao-car-rental (official-website)',
                        url :'./imgs/work_detail/APP/Lifestyle/04.Wangdao-car-rental(official-website)+色号ff797f.png',
                        thumbnail :'./imgs/work_detail/APP/Lifestyle/04.Wangdao-car-rental(official-website)_thumbnail.png',
                        color: '#ff797f'
                    }]
                ]
            ],
            'finance': [
                [
                    [{
                        title: 'HUAYUN internal operation application (official-website)',
                        url :'./imgs/work_detail/APP/Finance/01.HUAYUN-internal-operation-application(official-website)--+--色号328be7.png',
                        thumbnail: './imgs/work_detail/APP/Finance/01.HUAYUN-internal-operation-application(official-website)_thumbnail.png',
                        color: '#328be7'
                    },
                    {
                        title: 'Anyi Finance (officail-website)',
                        url :'./imgs/work_detail/APP/Finance/02.Anyi-Finance(officail-website)+色号47c5ee.png',
                        thumbnail: './imgs/work_detail/APP/Finance/02.Anyi-Finance(officail-website)_thumbnail.png',
                        color: '#47c5ee'
                    },
                    {
                        title: 'Xiaowei Finance (officail-website)',
                        url :'./imgs/work_detail/APP/Finance/03.Xiaowei-Finance(officail-website)+色号efa813.png',
                        thumbnail: './imgs/work_detail/APP/Finance/03.Xiaowei-Finance(officail-website)_thumbnail.png',
                        color: '#efa813'
                    }],
                    [{
                        title: 'Cisco (officail-website)',
                        url :'./imgs/work_detail/APP/Finance/04.Cisco(officail-website)+色号598aff.png',
                        thumbnail: './imgs/work_detail/APP/Finance/04.Cisco(officail-website)_thumbnail.png',
                        color: '#598aff'
                    },
                    {
                        title: 'Greentown (official-website)',
                        url :'./imgs/work_detail/APP/Finance/05.Greentown(officail-website)+色号5d9a45.png',
                        thumbnail: './imgs/work_detail/APP/Finance/05.Greentown(officail-website)_thumbnail.png',
                        color: '#5d9a45'
                    },
                    {
                        title: 'QIANBAO PAIFANG website',
                        url :'./imgs/work_detail/APP/Finance/06.QIANBAO-PAIFANG-website+色号ee5159.png',
                        thumbnail: './imgs/work_detail/APP/Finance/06.QIANBAO-PAIFANG-website_thumbnail.png',
                        color: '#ee5159'
                    }]
                ]
            ],
            'social_networking': [
                [
                    [{
                        title: 'Internal office application',
                        url :'./imgs/work_detail/APP/Social_Networking/01.Internal-office-application--+--色号6563a4.png',
                        thumbnail: './imgs/work_detail/APP/Social_Networking/01.Internal-office-application_thumbnail.png',
                        color: '#6563a4'
                    },
                    {
                        title: 'Shangshi Baike (official-website)',
                        url :'./imgs/work_detail/APP/Social_Networking/02.Shangshi-Baike(official-website)--+--色号5982ee.png',
                        thumbnail: './imgs/work_detail/APP/Social_Networking/02.Shangshi-Baike(official-website)_thumbnail.png',
                        color: '#5982ee'
                    },
                    {
                        title: 'Attendancy checking application',
                        url :'./imgs/work_detail/APP/Social_Networking/03.Attendancy-checking-application+色号968cf8.png',
                        thumbnail: './imgs/work_detail/APP/Social_Networking/03.Attendancy-checking-application_thumbnail.png',
                        color: '#968cf8'
                    }]
                ]
            ],
            'educition': [
                [
                    [{
                        title: 'Teaching platform for training programs',
                        url :'./imgs/work_detail/APP/Education/Teaching-platform-for-training-programs-+--色号307dfc.png',
                        thumbnail: './imgs/work_detail/APP/Education/Teaching-platform-for-training-programs_thumbnail.png',
                        color: '#307dfc'
                    }]
                ]
            ],
            'entertainment': [
                [
                    [{
                        title: 'KUNLUN sports (official-website)',
                        url :'./imgs/work_detail/APP/Entertainment/01.KUNLUN-sports(official-website)+色号ff6a11.png',
                        thumbnail: './imgs/work_detail/APP/Entertainment/01.KUNLUN-sports(official-website)_thumbnail.png',
                        color: '#ff6a11'
                    }]
                ]
            ],
            'others': [
                [
                    [{
                        title: 'Meiqi Dentist (offical-website)',
                        url :'./imgs/work_detail/APP/others/02.Meiqi-Dentist(offical-website)+色号3882f5.png',
                        thumbnail: './imgs/work_detail/APP/others/02.Meiqi-Dentist(offical-website)_thumbnail.png',
                        color: '#3882f5'
                    }]
                ]
            ]
        }

        //image carousel
        var coverEvent = function() {
            $pages =  $cover_container.find('li');
            var width = $pages.width() + 1,
                height = $pages.height(),
                size = $pages.size();
            
            $cover_container.width(width * size);

            var cover_carousel = new carousel({
                width: width,
                size: size,
                prev_btn: $('#work_detail .cover .previous'),
                next_btn: $('#work_detail .cover .next'),
                page_container: $cover_container
            });
            cover_carousel.updateBgText = function() {
                var curData = $('#work_detail .cover ul li').eq(this.index).data();
                var curItem = $('#work_detail .menu-item.active .menu-link').text();
                $('.image-text p').css({'color':curData.color});
                $('.image-text p:first').text(curItem);
                $('.image-text p:last').text(curData.title);
            }
            
            if(isFirst) {
                isFirst = false;
                cover_carousel.init();

                $('#work_detail .cover-content').parallax();

                $detail_cover.hide();
                $detail_cover.find('.cover-remove').click(function(){
                    $detail_cover.hide(300);
                    $('#work_detail .back').show();
                });
            }

            $('#work_detail .page-container').off('click', '.page .cake');
            $('#work_detail .page-container').on('click', '.page .cake', function() {
                var curIndex = $(this).data().index;
                cover_carousel.reset({size: size, width: width, index: curIndex});
                
                $detail_cover.show(300);
                $('#work_detail .back').hide();
            });
        }

        var updateDetailContent = function(obj) {
            if(detailImgs[$(obj).data().arrkey]) {
                var imgs = detailImgs[$(obj).data().arrkey];
                var $page_container = $('.page-container').html('').width('auto').height('auto');
                $cover_container.html('').width('auto');

                var cakeIndex = 0;
                for (var i=0; i<imgs.length; i++) {
                    var $page = $('<div class="page"></div>');
                    var lines = imgs[i];
                    for(var j=0; j<lines.length; j++) {
                        var $line = $('<div class="line"></div>');
                        var cakes = lines[j];
                        for(var k=0; k<cakes.length; k++) {
                            var $cake = $('<div class="cake" data-index="'+ cakeIndex +'"></div>');
                            var cake = cakes[k];
                            $cake.append($('<img>').attr('src', cake.thumbnail));
                            $cake.append($('<p>').text(cake.title));
                            $line.append($cake);
                            cakeIndex++;
                            //cover part
                            $cover_container.append('<li data-title="'+ cake.title +'" data-color="'+ cake.color +'"><img src="'+ cake.url +'"/></li>');
                        }
                        $page.append($line);
                    }
                    $page_container.append($page);
                }
                coverEvent();
                var $pages = $page_container.find('.page'),
                    width = $pages.width() + 1,
                    height = $pages.height(),
                    size = $pages.size();
                
                    $page_container.width(width * size);
                
                    /*if(detail_carousel) {
                        detail_carousel.reset();
                    }else {
                            var detail_carousel = new carousel({
                            width: width,
                            size: size,
                            prev_btn: $('.right-content .prev'),
                            next_btn: $('.right-content .next'),
                            page_container: $page_container
                        });
                        detail_carousel.init();
                        window.detail_carousel = detail_carousel;
                    }*/
            }
        }

        $parent_menus.each(function(index, menu_item){
            var $menu_item = $(menu_item);
            var $child_menu = $menu_item.find('.menu.child');
            if( $child_menu.length > 0 ) {
                $menu_item.on('click', function(event){
                    var hidden = $child_menu.is(':hidden');
                    if(hidden) {
                        $child_menu.show(300);
                    }else {
                        $child_menu.hide(300);
                    }
                })
            }else {
                $menu_item.on('click', function(event) {
                    $parent_menus.removeClass('active');
                    $child_menus.removeClass('active');
                    $(this).addClass('active');
                    updateDetailContent(this);
                });
            }
        });

        $child_menus.click(function(event) {
            event.preventDefault();
            event.stopPropagation();
            $parent_menus.removeClass('active');
            $child_menus.removeClass('active');
            $(this).addClass('active');
            updateDetailContent(this);
        });

        $parent_menus[$parent_menus.length - 1].click();
    })();

    //content
    (function(){
        
        $('#work_detail .work-detail-container .back').click(function() {
            $('#work_detail').addClass('work_detail_hidden');
            //detail_carousel.reset();
        });
    })();

    //image carousel
    (function(){
        /*var $cover_container = $('#work_detail .cover ul'),
        $pages = $cover_container.find('li'),
        width = $pages.width() + 1,
        height = $pages.height(),
        size = $pages.size();
    
        $cover_container.width(width * size);
    
        var cover_carousel = new carousel({
            width: width,
            size: size,
            prev_btn: $('#work_detail .cover .previous'),
            next_btn: $('#work_detail .cover .next'),
            page_container: $cover_container
        });
        cover_carousel.init();

        $('#work_detail .cover-content').parallax();

        var $detail_cover = $('#work_detail .cover');
        $detail_cover.hide();
        $('#work_detail .page-container').on('click', '.page .cake', function() {
            $detail_cover.show(300);
            $('#work_detail .back').hide();
        });
        $detail_cover.find('.cover-remove').click(function(){
            $detail_cover.hide(300);
            cover_carousel.reset();
            $('#work_detail .back').show();
        });*/
    })();
})();

//team
(function() {
    var $opus = $('#opus');
    var $table_holder = $opus.find('.table_holder');
    var $chars = $table_holder.find('.char');

    $chars.on('mouseover', function(event){
        var char = $(this).data().char;
        if(!char){
            return;
        }
        $chars.removeClass('active');
        $(this).addClass('active');
        // var $sameChars = $table_holder.find('.' + char +'-char');
        // $sameChars.addClass('active');
        // if($sameChars.length > 1 ) {
        //     $opus.addClass('active double-active-bg');
        // }else {
        //     $opus.addClass('active single-active-bg');
        // }
    });
    $chars.on('mouseleave', function(event){
        var char = $(this).data().char;
        if(!char){
            return;
        }
        $chars.removeClass('active');
        // $opus.removeClass('active');
        // $opus.removeClass('single-active-bg');
        // $opus.removeClass('double-active-bg');
    })
})();

// init animations
function initHomeAnimations() {
    var canUseCSS3 = isCSSFeatureSupported('animation') && isCSSFeatureSupported('transition');
    /*********Home*************/
    var homeAnimationsSequence = new Sequence();
    var homeparent = $("#home_slide_anims");
    var textContainer = homeparent.find('.text-wrap .content');
    if(canUseCSS3){
        $(".ele.slogan", homeparent).show().addClass("trigger");
        $(".nextwin_wrap").show().addClass("trigger");
    }
    else{
        $(".nextwin_wrap").show();
        $(".home-slide .slogan").animate({width: "100%"},1000).animate({width: "35%"},1000);

    }

    function pushTasks(ms) {
        homeAnimationsSequence.tasks.push({
            wait: ms || 500,
            task: function() {
                textContainer.text('Inspiration');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Perspiration');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Creativity');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Passion');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Beyond Your Imagination');
                setTimeout(function(){
                    homeAnimationsSequence.tasks = [];
                    pushTasks(2000);
                    resetHomeAnimations();
                    homeAnimationsSequence.run();
                },0);
            }
        });
    }
    pushTasks();
    resetHomeAnimations();
    homeAnimationsSequence.run();
    function resetHomeAnimations() {
        homeAnimationsSequence.reset();
    };
    var skipped = false;
    var disableHand = false;

    var $menuLinks = $('.menu-item', '#sidenav');
    var $menuPoints = $('.timeline-point-ctn', '#timeline');

    var $sectionViewsHolder = $('#section_views-holder');
    var $sectionViews = $('#section_views');

    var intro = new Action();
    intro.enterAction = function(from, to) {
        opuscarousel.reset();
        resetHomeAnimations();
        homeAnimationsSequence.run();
        if (canUseCSS3) {
            $sectionViews.css({
                top: '0%'
            });
        } else {
            $sectionViews.stop(true).animate({
                top: '0'
            }, 1000, 'linear');
        }

        activateMenuItem($menuLinks[0], $menuPoints[0]);
    };
    intro.length = canUseCSS3 ? 1000 : 1000;

    /* ********* better  ********* */
    $('#home_slide_anims').parallax();

    var lookInsideMobile1 = new Action();
    lookInsideMobile1.enterAction = function(from, to) {
        opuscarousel.reset();
        if (canUseCSS3) {
            $sectionViews.css({
                top: '-100%'
            });
        } else {
            $sectionViews.stop(true).animate({
                top: '-100%'
            }, 1000, 'linear');
        }
        activateMenuItem($menuLinks[1], $menuPoints[1]); //1
    };
    lookInsideMobile1.length = 1000;

   


    /*************   miniUI  *****************/
    var tickN = 0;
    var miniUIParent = $("#miniUI_slide_anims");
    var _w = 104;
    var _h = 104;
    
    var miniui = new Action();
    miniui.enterAction = function(from, to) {
        opuscarousel.reset();
        if (canUseCSS3) {
            $sectionViews.css({
                top: '-200%'
            });
        } else {
            $sectionViews.stop(true).animate({
                top: '-200%'
            }, 1000, 'linear');
        }
        activateMenuItem($menuLinks[2], $menuPoints[2]); //1
    }
    miniui.length = 1000;


    /* *************  opus  **************/
    var opus = new Action();
    opus.enterAction = function(from, to) {
        opuscarousel.reset();
        if (canUseCSS3) {
            $sectionViews.css({
                top: '-300%'
            });

            // opuscarousel._start();
        } else {
            $sectionViews.stop(true).animate({
                top: '-300%'
            }, 1000, 'linear');
            // opuscarousel._start();
        }
        activateMenuItem($menuLinks[3], $menuPoints[3]); 
    };
    opus.length = 1000;


    var actionsOther = new Actions();
    actionsOther.add(intro); 
    actionsOther.add(lookInsideMobile1); 
    actionsOther.add(miniui); 
    actionsOther.add(opus); 

    var href= location.href.split("?")[1];
    
    if(href){
        var currentid = href.split("=")[1];

        actionsOther.goto(0);
    }

    function activateMenuItem(link, point) {
        $menuLinks.removeClass('active');
        $menuPoints.removeClass('active');
        $('#sidenav').removeClass('sidenav-visiable').addClass('sidenav-hidden');

        if (!link) {
            link = $menuLinks[$(point).index()];
        }

        if (!point) {
            point = $menuPoints[$(link).index()];
        }

        $(link).addClass('active');
        $(point).addClass('active');

    }

    function gotoMenuItem(link, point) {
        var linkChild = $(link).find('a')[0];
        var pointChild = $(point).find('a')[0];
        switch ((linkChild || pointChild).hash) {
            case '#nav_0':
            case '#nav_1':
            case '#nav_2':
            case '#nav_3':
                actionsOther.running = false;
                clearTimeout(actionsOther.timeout);
                activateMenuItem(link, point);
        }
        
        switch ((linkChild || pointChild).hash) {
            case '#nav_0':
                actionsOther.goto(0);
                break;
            case '#nav_1':
                actionsOther.goto(1);
                break;
            case '#nav_2':
                actionsOther.goto(2);
                break;
            case '#nav_3':
                actionsOther.goto(3);
                break;
        }
    }

    

    $menuPoints.click(function(event) {
        event.preventDefault();
        gotoMenuItem(null, this);
    });
    $menuLinks.click(function(event) {
        event.preventDefault();
        gotoMenuItem(this, null);
    });

    var fakeEvent = {
        deltaY: 0
    };

    function onMouseWheel(event, instance) {

        if (event.deltaY < 0) {
            instance.next(instance);
        } else {
            instance.prev(instance);
        }
    }

    $sectionViewsHolder.mousewheel(function(event) {
        event.stopPropagation();

        if (!actionsOther.running) {
            onMouseWheel(event, actionsOther);
        }
    });

    $body.keydown(function(event) {
        var instance = actionsOther

        fakeEvent.deltaY = 0;

        if (event.keyCode == 38) {
            fakeEvent.deltaY = 1;
        }
        if (event.keyCode == 40) {
            fakeEvent.deltaY = -1;
        }

        if (fakeEvent.deltaY != 0) {
            onMouseWheel(fakeEvent, instance);
            return false;
        }
    });

    if (Device.isTouchscreen && !Device.isMobile) {
        var touchStart = 0;
        var touchEnd = 0;
        var touchStarted = false;
        var touchMoved = false;
        var touchInstance;
        var longTouchTimeout;

        function onTouchStart(instance, event) {
            clearTimeout(longTouchTimeout);

            touchStart = event.changedTouches[0].pageY;
            touchInstance = instance;

            touchStarted = true;
            touchMoved = false;

            longTouchTimeout = setTimeout(function() {
                touchStarted = false;
                touchMoved = false;
            }, 250);
        }

        function onTouchMove(instance, event) {
            clearTimeout(longTouchTimeout);

            if (touchStarted && touchInstance === instance) {
                event.preventDefault();
                touchMoved = true;
            }
        }

        function onTouchEnd(instance, event) {
            touchEnd = event.changedTouches[0].pageY;
            fakeEvent.deltaY = touchEnd - touchStart;

            if (touchInstance === instance && touchMoved && Math.abs(fakeEvent.deltaY) > 50) {
                onMouseWheel(fakeEvent, touchInstance);
            }

            touchStarted = false;
            touchMoved = false;
        }

        $sectionViewsHolder[0].addEventListener('touchcancel', function(event) {
            onTouchEnd(actionsOther, event)
        });
        $sectionViewsHolder[0].addEventListener('touchstart', function(event) {
            onTouchStart(actionsOther, event)
        });
        $sectionViewsHolder[0].addEventListener('touchmove', function(event) {

            onTouchMove(actionsOther, event)
        });
        $sectionViewsHolder[0].addEventListener('touchend', function(event) {
            onTouchEnd(actionsOther, event)
        });
    }
}

initHomeAnimations();

function initmobileAnimations(){
    var canUseCSS3 = isCSSFeatureSupported('animation') && isCSSFeatureSupported('transition');

    /*********Home*************/
    var homeAnimationsSequence = new Sequence();
    var homeparent = $("#home_slide_anims");
    var textContainer = homeparent.find('.text-wrap .content');
 
    function resetHomeAnimations() {
        homeAnimationsSequence.reset();
    };

    function pushTasks(ms) {
        homeAnimationsSequence.tasks.push({
            wait: ms || 500,
            task: function() {
                textContainer.text('Inspiration');
            }
        });
       homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Perspiration');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Creativity');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Passion');
            }
        });
        homeAnimationsSequence.tasks.push({
            wait: 500,
            task: function() {
                textContainer.text('Beyond Your Imagination');
                setTimeout(function(){
                    homeAnimationsSequence.tasks = [];
                    pushTasks(2000);
                    resetHomeAnimations();
                    homeAnimationsSequence.run();
                },0);
            }
        }); 
    }
    pushTasks();
    resetHomeAnimations();
    homeAnimationsSequence.run();
}

(function() {

    // http://stackoverflow.com/a/11381730/989439
    function mobilecheck() {
        var check = false;
        (function(a){if(/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    }

    var support = { animations : Modernizr.cssanimations },
        animEndEventNames = { 'WebkitAnimation' : 'webkitAnimationEnd', 'OAnimation' : 'oAnimationEnd', 'msAnimation' : 'MSAnimationEnd', 'animation' : 'animationend' },
        animEndEventName = animEndEventNames[ Modernizr.prefixed( 'animation' ) ],
        onEndAnimation = function( el, callback ) {
            var onEndCallbackFn = function( ev ) {
                if( support.animations ) {
                    if( ev.target != this ) return;
                    this.removeEventListener( animEndEventName, onEndCallbackFn );
                }
                if( callback && typeof callback === 'function' ) { callback.call(); }
            };
            if( support.animations ) {
                el.addEventListener( animEndEventName, onEndCallbackFn );
            }
            else {
                onEndCallbackFn();
            }
        },
        eventtype = mobilecheck() ? 'touchstart' : 'click';

    [].slice.call( document.querySelectorAll( '.cbutton' ) ).forEach( function( el ) {
        el.addEventListener( eventtype, function( ev ) {
            classie.add( el, 'cbutton--click' );
            onEndAnimation( classie.has( el, 'cbutton--complex' ) ? el.querySelector( '.cbutton__helper' ) : el, function() {
                classie.remove( el, 'cbutton--click' );
            } );
        } );
    } );

})();