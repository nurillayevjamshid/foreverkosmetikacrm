import os

file_path = "index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# The part we want to find (it's currently broken)
broken_start = '<div class="modal-overlay" id="productDetailsModal">'
# We find where productDetailsModal ends
end_of_product_modal = content.find('</div>\n        </div>\n    </div>', content.find(broken_start))
if end_of_product_modal == -1:
     # try with different whitespace
     end_of_product_modal = content.find('</div>\r\n        </div>\r\n    </div>', content.find(broken_start))

if end_of_product_modal != -1:
    end_of_product_modal += len('</div>\n        </div>\n    </div>')
    
    # The part that is currently there after the product modal
    # It seems it has something like:
    # </div>\n\n                        </button>\n                        <div class="select-dropdown">
    
    # We want to replace from after product modal up until the part that belongs to newUserRolePicker
    
    target_pattern = '</button>\n                        <div class="select-dropdown">'
    target_pos = content.find(target_pattern, end_of_product_modal)
    
    if target_pos != -1:
        new_section = r"""
    <!-- Finance Details Modal -->
    <div class="modal-overlay" id="financeDetailsModal">
        <div class="modal">
            <div class="modal-header">
                <h2><i class="fas fa-wallet"></i> Tranzaksiya ma'lumotlari</h2>
                <button class="modal-close" data-modal="financeDetailsModal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div id="financeDetailsIconWrap" style="width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 20px;">
                    <i id="financeDetailsIcon" class="fas fa-receipt"></i>
                </div>
                <div class="product-details-header" style="text-align: center; justify-content: center; flex-direction: column; align-items: center;">
                    <div class="product-details-price" id="financeDetailsAmount" style="font-size: 24px; margin-bottom: 5px;">-</div>
                    <div class="product-details-title" id="financeDetailsCategory" style="font-size: 16px; opacity: 0.8;">-</div>
                </div>
                <ul class="info-list" style="margin-top: 25px;">
                    <li class="info-item">
                        <span class="info-label">Sana</span>
                        <span class="info-value" id="financeDetailsDate">-</span>
                    </li>
                    <li class="info-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                        <span class="info-label">Tavsif</span>
                        <span class="info-value" id="financeDetailsDescription" style="white-space: pre-wrap; word-break: break-word; text-align: left; width: 100%;">-</span>
                    </li>
                </ul>
                <div class="modal-footer" style="margin-top: 30px;">
                    <button type="button" class="btn btn-secondary" data-modal="financeDetailsModal" style="width: 100%;">Yopish</button>
                </div>
            </div>
        </div>
    </div>

    <!-- User Form Modal -->
    <div class="modal-overlay" id="userModal">
        <div class="modal">
            <div class="modal-header">
                <h2 id="userModalTitle"><i class="fas fa-user-plus"></i> Yangi xodim qo'shish</h2>
                <button class="modal-close" data-modal="userModal"><i class="fas fa-times"></i></button>
            </div>
            <form id="userForm" class="modal-body">
                <input type="hidden" id="editUserId">
                <div class="form-group">
                    <label for="newUserName"><i class="fas fa-user"></i> To'liq ismi</label>
                    <input type="text" id="newUserName" placeholder="Masalan: Kozimjon" required>
                </div>
                <div class="form-group">
                    <label for="newUserEmail"><i class="fas fa-envelope"></i> Email (Login)</label>
                    <input type="email" id="newUserEmail" placeholder="admin@gmail.com" required>
                </div>
                <div class="form-group">
                    <label for="newUserRole"><i class="fas fa-user-tag"></i> Rol</label>
                    <div class="select-picker" id="newUserRolePicker">
                        <input type="hidden" id="newUserRole" required value="manager">
                        <button type="button" class="select-trigger">
                            <span class="select-trigger-label">Manager (Cheklangan)</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
"""
        final_content = content[:end_of_product_modal] + new_section + content[target_pos:]
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(final_content)
        print("Success")
    else:
        print("Could not find target pattern")
else:
    print("Could not find end of product modal")
